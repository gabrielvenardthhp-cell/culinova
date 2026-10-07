import React, { useState } from 'react';
import { Plus, FolderTree, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Category } from '../../types';
import { Modal } from '../common/Modal';

interface CategoriesViewProps {
  categories: Category[];
  onAddCategory: (data: Partial<Category>) => Promise<void>;
  onUpdateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  isLoading: boolean;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  isLoading,
}) => {
  const [selectedType, setSelectedType] = useState<'ALL' | 'RECIPE' | 'INGREDIENT' | 'MENU'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'RECIPE' as Category['type'],
    status: 'ACTIVE' as Category['status'],
  });

  const filteredCategories = categories.filter(c =>
    selectedType === 'ALL' ? true : c.type === selectedType
  );

  const handleOpenAdd = () => {
    setFormError(null);
    setEditingCategory(null);
    setFormData({
      name: '',
      type: selectedType === 'ALL' ? 'RECIPE' : selectedType,
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setFormError(null);
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      type: cat.type,
      status: cat.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Nama kategori wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingCategory) {
        await onUpdateCategory(editingCategory.id, formData);
      } else {
        await onAddCategory(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan kategori.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus atau nonaktifkan kategori ini? Kategori yang sudah memiliki item akan di-soft disable.')) return;
    try {
      await onDeleteCategory(id);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus kategori.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-stone-200/60">
        <div>
          <h2 className="font-display text-xl lg:text-[22px] font-bold tracking-tight text-[#2B2118]">
            Master Kategori (Categories)
          </h2>
          <p className="text-xs text-[#735A47] mt-0.5">
            Pengelompokan taksonomi untuk Bahan Baku, Resep Masakan, dan Menu Jual.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn-pill-primary self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Kategori</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar overscroll-x-contain scroll-smooth -mx-1 px-1">
        {(['ALL', 'RECIPE', 'INGREDIENT', 'MENU'] as const).map(tab => {
          const isActive = selectedType === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedType(tab)}
              className={`relative px-3.5 py-1.5 text-xs rounded-full transition-colors duration-180 cursor-pointer select-none shrink-0 ${
                isActive
                  ? 'text-white font-bold'
                  : 'bg-white/70 text-[#735A47] hover:bg-white hover:text-[#2B2118] border border-white/80 font-medium'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="categoryTypeTabActive"
                  className="absolute inset-0 bg-[#D9482B] rounded-full shadow-xs -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              {tab === 'ALL' ? 'Semua Kategori' : tab === 'RECIPE' ? 'Resep' : tab === 'INGREDIENT' ? 'Bahan Baku' : 'Menu Jual'}
            </button>
          );
        })}
      </div>

      <div className="glass-solid rounded-[28px] overflow-hidden shadow-xs border border-white/70">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-stone-200/60 bg-white/60 text-[#735A47] font-semibold text-[10.5px] uppercase tracking-wider">
              <th className="py-3 px-4">Nama Kategori</th>
              <th className="py-3 px-4">Modul Target</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100/80">
            {filteredCategories.map(cat => (
              <tr key={cat.id} className="hover:bg-white/60 transition-colors">
                <td className="py-3 px-4 font-semibold text-[#2B2118]">{cat.name}</td>
                <td className="py-3 px-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-stone-100 text-[#735A47] border border-stone-200/60">
                    {cat.type}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-medium ${
                      cat.status === 'ACTIVE'
                        ? 'badge-safe'
                        : 'badge-warn'
                    }`}
                  >
                    {cat.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 text-[#735A47] hover:text-[#2B2118] hover:bg-white/80 rounded-full transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 text-[#D9482B] hover:bg-[#FDEDE8] rounded-full transition-colors"
                      title="Hapus / Nonaktifkan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
        subtitle="Gunakan kategori deskriptif untuk klasifikasi biaya yang rapi."
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-[14px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#2B2118] mb-1.5">Nama Kategori</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="input-pill"
              placeholder="Contoh: Makanan, Minuman, Saus, Bumbu"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1.5">Tipe Modul</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className="input-pill cursor-pointer"
              >
                <option value="RECIPE">Resep (Recipe)</option>
                <option value="INGREDIENT">Bahan Baku (Ingredient)</option>
                <option value="MENU">Menu Jual (Sales Menu)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1.5">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="input-pill cursor-pointer"
              >
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200/60 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-pill-secondary"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-pill-primary disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Kategori'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
