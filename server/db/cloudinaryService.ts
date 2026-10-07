import { Buffer } from 'node:buffer';

export interface CloudinaryUploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  url?: string;
  message?: string;
  publicId?: string;
}

class CloudinaryService {
  private getConfig() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    return { cloudName, apiKey, apiSecret };
  }

  public isConfigured(): boolean {
    const { cloudName, apiKey, apiSecret } = this.getConfig();
    return Boolean(cloudName && apiKey && apiSecret);
  }

  /**
   * Upload an image to Cloudinary using the server-side Upload API.
   * The API secret is used only on the server and is never sent to the browser.
   */
  public async uploadImage(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    type: 'recipe' | 'menu' = 'recipe',
    customName?: string
  ): Promise<CloudinaryUploadResult> {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
      return {
        success: false,
        message: 'Format file tidak didukung. Gunakan format JPG, JPEG, PNG, atau WEBP.',
      };
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (fileBuffer.length > MAX_SIZE) {
      return {
        success: false,
        message: 'File terlalu besar. Maksimal 5 MB.',
      };
    }

    const { cloudName, apiKey, apiSecret } = this.getConfig();
    if (!cloudName || !apiKey || !apiSecret) {
      return {
        success: false,
        message:
          'Cloudinary belum dikonfigurasi. Pastikan CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET tersedia di environment variables server.',
      };
    }

    const ext = this.getExtension(mimeType, originalName);
    const slug = this.slugify(customName || originalName.replace(/\.[^/.]+$/, ''));
    const timestamp = Math.floor(Date.now() / 1000);
    const fileName = `${type}-${slug}-${timestamp}.${ext}`;
    const publicId = `${type}-${slug}-${timestamp}`;

    try {
      const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;
      const form = new FormData();
      const blob = new Blob([fileBuffer], { type: mimeType });
      form.append('file', blob, fileName);
      form.append('folder', `culinova/${type}s`);
      form.append('public_id', publicId);

      const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
        },
        body: form,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.secure_url || !data.public_id) {
        const cloudinaryMessage =
          data?.error?.message || `Cloudinary upload gagal (HTTP ${response.status}).`;
        throw new Error(cloudinaryMessage);
      }

      return {
        success: true,
        fileId: data.public_id,
        publicId: data.public_id,
        fileName,
        url: data.secure_url,
      };
    } catch (err: any) {
      console.error('Cloudinary image upload error:', err?.message || err);
      return {
        success: false,
        message: err?.message || 'Gagal mengunggah gambar ke Cloudinary.',
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

export const cloudinaryService = new CloudinaryService();
