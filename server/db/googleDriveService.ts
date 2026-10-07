import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

export interface UploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  url?: string;
  message?: string;
  isDemoFallback?: boolean;
}

class GoogleDriveService {
  private driveClient: drive_v3.Drive | null = null;
  private folderId: string = '';

  constructor() {
    this.initClient();
  }

  private initClient() {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    this.folderId = folderId || '';

    if (clientEmail && privateKey) {
      try {
        const auth = new google.auth.JWT({
          email: clientEmail,
          key: privateKey,
          scopes: [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/drive.file',
          ],
        });
        this.driveClient = google.drive({ version: 'v3', auth });
      } catch (err) {
        console.error('Failed to initialize Google Drive JWT client:', (err as Error).message);
        this.driveClient = null;
      }
    } else {
      this.driveClient = null;
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.driveClient && this.folderId);
  }

  public getFolderId(): string {
    return this.folderId;
  }

  /**
   * Test connection to Google Drive and verify folder accessibility
   */
  public async testConnection(): Promise<{ success: boolean; message: string; folderName?: string }> {
    if (!this.driveClient) {
      return {
        success: false,
        message: 'Kredensial Service Account (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) belum dikonfigurasi.',
      };
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || this.folderId;
    if (!folderId) {
      return {
        success: false,
        message: 'GOOGLE_DRIVE_FOLDER_ID belum dikonfigurasi di environment variables.',
      };
    }

    try {
      const folderRes = await this.driveClient.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType',
        supportsAllDrives: true,
      });

      const folderName = folderRes.data.name || 'CULINOVA_IMAGES';
      return {
        success: true,
        message: `Berhasil terhubung ke folder Google Drive: "${folderName}".`,
        folderName,
      };
    } catch (err: any) {
      console.error('Google Drive connection error:', err.message);
      return {
        success: false,
        message: `Gagal mengakses folder Google Drive (${folderId}). Pastikan folder telah dibagikan (share) dengan email service account sebagai Editor.`,
      };
    }
  }

  /**
   * Upload an image to Google Drive folder and configure anyone-viewer permission
   */
  public async uploadImage(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    type: 'recipe' | 'menu' = 'recipe',
    customName?: string
  ): Promise<UploadResult> {
    // 1. Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
      return {
        success: false,
        message: 'Format file tidak didukung. Gunakan format JPG, JPEG, PNG, atau WEBP.',
      };
    }

    // 2. Validate file size (max 5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (fileBuffer.length > MAX_SIZE) {
      return {
        success: false,
        message: 'File terlalu besar. Maksimal 5 MB.',
      };
    }

    // Refresh client in case env vars were set recently
    if (!this.driveClient || !this.folderId) {
      this.initClient();
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || this.folderId;
    if (!this.driveClient || !folderId) {
      const ext = this.getExtension(mimeType, originalName);
      const slug = this.slugify(customName || originalName.replace(/\.[^/.]+$/, ''));
      const timestamp = Math.floor(Date.now() / 1000);
      const fileName = `${type}-${slug}-${timestamp}.${ext}`;
      const dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

      return {
        success: true,
        fileId: `drive-sim-${timestamp}`,
        fileName,
        url: dataUrl,
        isDemoFallback: true,
        message: 'Foto berhasil diproses. Simpan konfigurasi GOOGLE_DRIVE_FOLDER_ID di .env untuk integrasi cloud langsung.',
      };
    }

    try {
      // 3. Generate clean slug filename: [type]-[slug]-[timestamp].[ext]
      const ext = this.getExtension(mimeType, originalName);
      const slug = this.slugify(customName || originalName.replace(/\.[^/.]+$/, ''));
      const timestamp = Math.floor(Date.now() / 1000);
      const fileName = `${type}-${slug}-${timestamp}.${ext}`;

      // 4. Upload file to Google Drive folder
      const fileMetadata: drive_v3.Schema$File = {
        name: fileName,
        parents: [folderId],
      };

      const media = {
        mimeType,
        body: Readable.from(fileBuffer),
      };

      const res = await this.driveClient.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, webViewLink, webContentLink',
        supportsAllDrives: true,
      });

      const fileId = res.data.id;
      if (!fileId) {
        throw new Error('Google Drive did not return a valid file ID.');
      }

      // 5. Configure permission: Anyone with the link -> Viewer (Reader)
      try {
        await this.driveClient.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
          supportsAllDrives: true,
        });
      } catch (permErr: any) {
        console.warn('Warning: Could not set public reader permission:', permErr.message);
      }

      // 6. Generate reliable image display URL
      // https://drive.google.com/uc?export=view&id=FILE_ID
      const url = `https://drive.google.com/uc?export=view&id=${fileId}`;

      return {
        success: true,
        fileId,
        fileName,
        url,
      };
    } catch (err: any) {
      console.error('Google Drive image upload error:', err.message);
      return {
        success: false,
        message: err.message || 'Gagal mengupload gambar ke Google Drive.',
      };
    }
  }

  private getExtension(mimeType: string, originalName: string): string {
    const extFromName = originalName.split('.').pop()?.toLowerCase();
    if (extFromName && ['jpg', 'jpeg', 'png', 'webp'].includes(extFromName)) {
      return extFromName === 'jpeg' ? 'jpg' : extFromName;
    }
    switch (mimeType.toLowerCase()) {
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'image/jpeg':
      case 'image/jpg':
      default:
        return 'jpg';
    }
  }

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'image';
  }
}

export const googleDriveService = new GoogleDriveService();
