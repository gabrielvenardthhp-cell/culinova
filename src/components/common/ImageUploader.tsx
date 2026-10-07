import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle,
  X,
  Loader2,
  ExternalLink,
  Sparkles,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { swalAlerts } from '../../lib/swal';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string, fileId?: string) => void;
  entityType?: 'recipe' | 'menu';
  entityName?: string;
  entityId?: string;
  label?: string;
  helperText?: string;
}

const PRESET_IMAGES = [
  { label: 'Ayam Geprek', url: '/src/assets/images/dish_ayam_geprek_1791109817096.jpg' },
  { label: 'Nasi Goreng', url: '/src/assets/images/dish_nasi_goreng_1791109832554.jpg' },
  { label: 'Mie Ayam', url: '/src/assets/images/dish_mie_ayam_1791109845039.jpg' },
  { label: 'Chocolate Cake', url: '/src/assets/images/dish_chocolate_cake_1791109868136.jpg' },
];

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  entityType = 'recipe',
  entityName = '',
  entityId,
  label = 'Foto Makanan / Minuman',
  helperText = 'Format: JPG, JPEG, PNG, WEBP (Maksimal 5 MB). Diunggah langsung ke Google Drive.',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelectFile = (file: File) => {
    // 1. Validate File Format: JPG, JPEG, PNG, WEBP
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isMimeValid = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type.toLowerCase());
    const isExtValid = ext ? allowedExtensions.includes(ext) : false;

    if (!isMimeValid && !isExtValid) {
      swalAlerts.invalidFileType();
      if (fileInputRef.current) fileInputRef.current.value = '';
      return false;
    }

    // 2. Validate File Size: Max 5 MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      swalAlerts.fileTooLarge(5);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return false;
    }

    // Generate local preview
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSelectFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSelectFile(file);
    }
  };

  const handleCancelSelection = () => {
    setSelectedFile(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadImage = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('type', entityType);
      if (entityName) formData.append('name', entityName);
      if (entityId) {
        if (entityType === 'recipe') formData.append('recipe_id', entityId);
        if (entityType === 'menu') formData.append('menu_id', entityId);
      }

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Gagal mengunggah foto ke Google Drive.');
      }

      // Success
      const uploadedUrl = data.url;
      const fileId = data.fileId;
      onChange(uploadedUrl, fileId);
      setCustomUrl(uploadedUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsUploading(false);

      // Trigger success alert without awaiting so upload is completed immediately
      swalAlerts.uploadSuccess(data.fileName || selectedFile.name, !data.isDemoFallback);
    } catch (err: any) {
      console.error('Upload image error:', err);
      setIsUploading(false);
      swalAlerts.uploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyCustomUrl = () => {
    if (customUrl.trim()) {
      onChange(customUrl.trim());
      setShowUrlInput(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const activeDisplayUrl = previewUrl || value;

  return (
    <div className="space-y-2 text-xs">
      {/* Label & Type Header */}
      <div className="flex items-center justify-between">
        <label className="font-semibold text-[#141F1A] flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-[#274035]" />
          <span>{label}</span>
        </label>
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[#718279] hover:text-[#274035] transition-colors"
          >
            {showUrlInput ? 'Tutup URL' : 'Edit URL Langsung'}
          </button>
        </div>
      </div>

      {/* Optional Direct URL Input Field */}
      {showUrlInput && (
        <div className="flex items-center gap-2 p-2 bg-white/70 border border-stone-200/80 rounded-xl">
          <input
            type="text"
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            placeholder="https://drive.google.com/uc?export=view&id=..."
            className="flex-1 px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono text-[#141F1A] focus:outline-none focus:border-[#274035]"
          />
          <button
            type="button"
            onClick={handleApplyCustomUrl}
            className="btn-luxury-primary px-3 py-1.5 text-xs font-medium rounded-lg"
          >
            Terapkan
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Upload Box */}
      {selectedFile && previewUrl ? (
        /* Selected Image State: PREVIEW + CONFIRM UPLOAD */
        <div className="glass-solid p-4 rounded-2xl border border-[#274035]/30 space-y-3 bg-white/95 shadow-sm transition-all duration-200">
          <div className="text-[11px] font-semibold text-[#274035] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>IMAGE PREVIEW (Siap Diunggah ke Google Drive)</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-36 h-28 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shrink-0 shadow-inner group">
              <img
                src={previewUrl}
                alt="Selected Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/10 pointer-events-none" />
            </div>

            <div className="flex-1 space-y-1.5 w-full">
              <div className="font-semibold text-sm text-[#141F1A] truncate" title={selectedFile.name}>
                {selectedFile.name}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#718279]">
                <span className="badge-champagne px-2 py-0.5 rounded-full font-mono text-[10px]">
                  {formatFileSize(selectedFile.size)}
                </span>
                <span className="badge-sage px-2 py-0.5 rounded-full uppercase font-mono text-[10px]">
                  {selectedFile.type.split('/')[1] || 'IMAGE'}
                </span>
              </div>
              <p className="text-[11px] text-[#506259]">
                File valid. Klik tombol <strong>Upload Image</strong> di bawah untuk menyimpan file ke folder <strong>CULINOVA_IMAGES</strong> di Google Drive.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200/60">
            <button
              type="button"
              onClick={handleCancelSelection}
              disabled={isUploading}
              className="btn-pill-secondary inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              <span>Batal</span>
            </button>

            <button
              type="button"
              onClick={handleUploadImage}
              disabled={isUploading}
              className="btn-pill-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengunggah ke Drive...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload Image</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Empty / Existing Photo State: Drag & Drop Zone or Select Image */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`glass-solid p-4 rounded-2xl border transition-all duration-200 ${
            isDragging
              ? 'border-[#D9482B] bg-[#FDEDE8]/60 shadow-md ring-2 ring-[#D9482B]/20'
              : 'border-dashed border-stone-300 hover:border-[#D9482B]/50 bg-white/70'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Current Image Thumbnail (if available) */}
            {activeDisplayUrl ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-stone-200/90 bg-stone-50 shrink-0 shadow-2xs group">
                <img
                  src={activeDisplayUrl}
                  alt="Current Photo"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={e => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-stone-900/10 group-hover:bg-transparent transition-colors" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl border border-stone-200/80 bg-stone-100/70 flex items-center justify-center shrink-0 text-[#8C7A6B]">
                <ImageIcon className="w-8 h-8 opacity-40" />
              </div>
            )}

            {/* Selector Trigger & Info */}
            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="font-semibold text-[#2B2118]">
                {activeDisplayUrl ? 'Foto Makanan Terpasang' : 'Pilih atau Unggah Foto'}
              </div>
              <p className="text-[11px] text-[#735A47] leading-relaxed">
                {helperText}
              </p>
              <div className="pt-1.5 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-pill-primary inline-flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>[ SELECT IMAGE ]</span>
                </button>

                {activeDisplayUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      setCustomUrl('');
                    }}
                    className="px-2.5 py-1.5 text-[11px] font-medium text-stone-500 hover:text-red-600 transition-colors"
                  >
                    Hapus Foto
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mt-3 pt-3 border-t border-stone-200/50 flex flex-wrap items-center gap-1.5 text-[11px] text-[#718279]">
            <span className="font-medium text-[#506259]">Pilihan Cepat:</span>
            {PRESET_IMAGES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(preset.url);
                  setCustomUrl(preset.url);
                }}
                className={`px-2 py-0.5 rounded-lg border transition-all text-[10.5px] ${
                  value === preset.url
                    ? 'bg-[#274035] text-white border-[#274035]'
                    : 'bg-white/80 border-stone-200/80 hover:border-[#274035]/40 hover:text-[#141F1A]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
