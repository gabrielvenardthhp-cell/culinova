import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

/**
 * Culinova Custom SweetAlert2 Mixin
 * Tailored to match the Luxury Culinary Intelligence (Liquid Glass) aesthetic.
 */
export const CulinovaSwal = Swal.mixin({
  customClass: {
    popup: 'culinova-swal-popup',
    title: 'culinova-swal-title',
    htmlContainer: 'culinova-swal-html',
    confirmButton: 'culinova-swal-confirm',
    cancelButton: 'culinova-swal-cancel',
  },
  buttonsStyling: false,
  showClass: {
    popup: 'culinova-swal-show',
  },
  hideClass: {
    popup: 'culinova-swal-hide',
  },
  allowOutsideClick: true,
  allowEscapeKey: true,
});

export const swalAlerts = {
  invalidFileType: (customMessage?: string) => {
    return CulinovaSwal.fire({
      icon: 'error',
      title: 'Format File Tidak Didukung',
      text: customMessage || 'Hanya format gambar JPG, JPEG, PNG, dan WEBP yang diperbolehkan untuk diunggah.',
      confirmButtonText: 'Mengerti',
    });
  },

  fileTooLarge: (maxMb: number = 5) => {
    return CulinovaSwal.fire({
      icon: 'error',
      title: 'Ukuran File Terlalu Besar',
      text: `Ukuran file foto melebihi batas maksimal ${maxMb} MB. Harap perkecil atau pilih file lain.`,
      confirmButtonText: 'Mengerti',
    });
  },

  uploadSuccess: (fileName: string, isDrive: boolean = true) => {
    return CulinovaSwal.fire({
      icon: 'success',
      title: 'Foto Berhasil Diunggah',
      text: isDrive
        ? `Foto "${fileName}" berhasil diunggah ke Google Drive dan tautan photo_url telah diperbarui.`
        : `Foto "${fileName}" berhasil diproses dan siap digunakan.`,
      confirmButtonText: 'Lanjutkan',
      timer: 2500,
      timerProgressBar: true,
      allowOutsideClick: true,
      allowEscapeKey: true,
    });
  },

  uploadError: (message: string) => {
    return CulinovaSwal.fire({
      icon: 'error',
      title: 'Gagal Mengunggah Foto',
      text: message || 'Terjadi kesalahan teknis saat mengunggah gambar ke server Google Drive.',
      confirmButtonText: 'Tutup',
    });
  },

  driveConfigError: (folderId?: string) => {
    return CulinovaSwal.fire({
      icon: 'warning',
      title: 'Google Drive Belum Dikonfigurasi',
      text: `Folder Google Drive ${folderId ? `(${folderId})` : ''} belum dikonfigurasi atau belum dibagikan dengan akses Editor ke Service Account.`,
      confirmButtonText: 'Tutup',
    });
  },
};
