import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, BookOpen, AlertCircle, TrendingUp, Percent, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { SalesMenu, Recipe, Category } from '../../types';
import { formatRupiah, formatPercent, calculateEstimatedSellingPrice } from '../../lib/formatters';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ImageUploader } from '../common/ImageUploader';

interface MenusViewProps {
  menus: SalesMenu[];
  recipes: Recipe[];
  categories: Category[];
  onAddMenu: (data: any) => Promise<void>;
  onUpdateMenu: (id: string, data: any) => Promise<void>;
  onDeleteMenu: (id: string) => Promise<void>;
  defaultTargetFoodCost?: number;
  priceRounding?: 'NONE' | '500' | '1000';
  isLoading: boolean;
}

export const MenusView: React.FC<MenusViewProps> = ({
  menus,
  recipes,
  categories,
  onAddMenu,
  onUpdateMenu,
  onDeleteMenu,
  defaultTargetFoodCost = 35,
  priceRounding = '500',
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<SalesMenu | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category_id: 'cat_menu_main',
    recipe_id: '',
    selling_price: 28000,
    hpp_override: '',
    photo_url: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const filteredMenus = useMemo(() => {
    return menus.filter(m => {
      const matchSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'ALL' || m.category_id === selectedCategory;
      const matchStatus = selectedStatus === 'ALL' || m.status === selectedStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [menus, searchTerm, selectedCategory, selectedStatus]);

  const handleOpenAdd = () => {
    setFormError(null);
    setEditingMenu(null);
    const firstRec = recipes[0];
    setFormData({
      code: `MNU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: '',
      category_id: 'cat_menu_main',
      recipe_id: firstRec?.id || '',
      selling_price: firstRec ? calculateEstimatedSellingPrice(firstRec.hpp_per_portion, defaultTargetFoodCost, priceRounding) : 25000,
      hpp_override: '',
      photo_url: firstRec?.photo_url || '/src/assets/images/dish_ayam_geprek_1791109817096.jpg',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (menu: SalesMenu) => {
    setFormError(null);
    setEditingMenu(menu);
    setFormData({
      code: menu.code,
      name: menu.name,
      category_id: menu.category_id,
      recipe_id: menu.recipe_id,
      selling_price: menu.selling_price,
      hpp_override: String(menu.hpp),
      photo_url: menu.photo_url,
      status: menu.status,
    });
    setIsModalOpen(true);
  };

  const handleRecipeChange = (recId: string) => {
    const rec = recipes.find(r => r.id === recId);
    if (rec) {
      const estPrice = calculateEstimatedSellingPrice(rec.hpp_per_portion, defaultTargetFoodCost, priceRounding);
      setFormData(prev => ({
        ...prev,
        recipe_id: recId,
        selling_price: estPrice,
        photo_url: rec.photo_url,
        hpp_override: String(rec.hpp_per_portion),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError('Nama menu jual wajib diisi.');
      return;
    }
    if (!formData.recipe_id) {
      setFormError('Pilih resep acuan untuk menu ini.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        selling_price: Number(formData.selling_price),
        hpp: formData.hpp_override ? Number(formData.hpp_override) : undefined,
      };

      if (editingMenu) {
        await onUpdateMenu(editingMenu.id, payload);
      } else {
        await onAddMenu(payload);
      }
      setIsModalOpen(false);
      setEditingMenu(null);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan menu jual.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      setIsSubmitting(true);
      await onDeleteMenu(deletingId);
      setDeletingId(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus menu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-stone-200/60">
        <div>
          <h2 className="font-display text-xl lg:text-[22px] font-bold tracking-tight text-[#2B2118]">
            Menu Jual (Sales Menus)
          </h2>
          <p className="text-xs text-[#735A47] mt-0.5">
            Daftar produk yang dijual kepada pelanggan (POS) dengan kalkulasi HPP dan margin aktif.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn-pill-primary self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Menu Jual</span>
        </button>
      </div>

      {/* Filter and Search Bar: Bug 2 Fix (Responsive Grid, 44px Controls, Custom Chevrons) */}
      <div className="glass-solid p-3.5 sm:p-4 rounded-[20px] shadow-2xs border border-white/80 grid grid-cols-1 md:grid-cols-[1fr_minmax(160px,220px)_minmax(140px,180px)] gap-3 items-center">
        <div className="relative w-full h-11">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari menu jual atau kode..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-11 rounded-full pl-10 pr-4 bg-white/90 border border-stone-200/80 text-xs text-[#2B2118] placeholder:text-[#8C7A6B] focus:outline-none focus:border-[#D9482B] focus:ring-2 focus:ring-[#D9482B]/15 transition-all"
          />
        </div>

        <div className="relative w-full h-11">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full h-11 rounded-full appearance-none pl-4 pr-9 bg-white/90 border border-stone-200/80 text-xs font-semibold text-[#2B2118] cursor-pointer focus:outline-none focus:border-[#D9482B] focus:ring-2 focus:ring-[#D9482B]/15 transition-all truncate"
          >
            <option value="ALL">Semua Kategori</option>
            {categories
              .filter(c => c.type === 'MENU')
              .map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <ChevronDown className="w-4 h-4 text-[#8C7A6B] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="relative w-full h-11">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full h-11 rounded-full appearance-none pl-4 pr-9 bg-white/90 border border-stone-200/80 text-xs font-semibold text-[#2B2118] cursor-pointer focus:outline-none focus:border-[#D9482B] focus:ring-2 focus:ring-[#D9482B]/15 transition-all truncate"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
          <ChevronDown className="w-4 h-4 text-[#8C7A6B] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredMenus.map((menu, idx) => {
          const isHighCost = menu.food_cost > defaultTargetFoodCost;
          return (
            <motion.div
              key={menu.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(idx * 0.04, 0.24) }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="glass rounded-[20px] overflow-hidden flex flex-col justify-between transition-shadow hover:shadow-md border border-white/80 group"
            >
              <div>
                <div className="relative h-40 bg-stone-100 overflow-hidden">
                  <img
                    src={menu.photo_url}
                    alt={menu.name}
                    className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                    onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 text-[10px] font-mono bg-white/90 backdrop-blur-md rounded-full text-[#2B2118] border border-white/90 shadow-2xs">
                    {menu.code}
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full shadow-2xs ${
                        menu.status === 'ACTIVE' ? 'badge-safe' : 'badge-warn'
                      }`}
                    >
                      {menu.status === 'ACTIVE' ? 'Aktif' : menu.status}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-display text-sm font-bold text-[#2B2118] line-clamp-1">{menu.name}</h3>
                    <p className="text-[11px] text-[#735A47] mt-0.5">
                      Resep: <span className="text-[#2B2118] font-medium">{menu.recipe_name}</span>
                    </p>
                  </div>

                  <div className="p-2.5 bg-white/70 backdrop-blur-md border border-stone-200/60 rounded-[16px] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] text-[#735A47] uppercase font-semibold">Harga Jual</div>
                      <div className="font-mono font-bold text-[#D9482B] tabular-nums mt-0.5">
                        {formatRupiah(menu.selling_price)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#735A47] uppercase font-semibold">HPP</div>
                      <div className="font-mono font-bold text-[#2B2118] tabular-nums mt-0.5">
                        {formatRupiah(menu.hpp)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#735A47] uppercase font-semibold">Food Cost</div>
                      <div
                        className={`font-mono font-semibold tabular-nums mt-0.5 ${
                          isHighCost ? 'text-[#D9482B]' : 'text-[#285A1D]'
                        }`}
                      >
                        {formatPercent(menu.food_cost)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#735A47] uppercase font-semibold">Margin</div>
                      <div className="font-mono font-semibold text-[#285A1D] tabular-nums mt-0.5">
                        {formatPercent(menu.margin)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0 border-t border-stone-100/70 mt-2 flex items-center justify-end gap-1">
                <button
                  onClick={() => handleOpenEdit(menu)}
                  className="p-1.5 text-[#735A47] hover:text-[#2B2118] hover:bg-white/80 rounded-full transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeletingId(menu.id)}
                  className="p-1.5 text-[#D9482B] hover:bg-[#FDEDE8] rounded-full transition-colors"
                  title="Hapus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add / Edit Menu Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMenu ? `Edit Menu: ${editingMenu.name}` : 'Tambah Menu Jual Baru'}
        subtitle="Hubungkan menu siap jual dengan resep dan tetapkan harga jual."
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1">Kode Menu</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="input-pill font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="input-pill cursor-pointer"
              >
                <option value="ACTIVE">Aktif (Tersedia)</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#2B2118] mb-1">Nama Menu Jual</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="input-pill"
              placeholder="Contoh: Paket Ayam Geprek + Nasi Hangat"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1">Resep Acuan</label>
              <select
                value={formData.recipe_id}
                onChange={e => handleRecipeChange(e.target.value)}
                className="input-pill cursor-pointer font-medium"
              >
                {recipes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} (HPP: {formatRupiah(r.hpp_per_portion)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1">Kategori Menu</label>
              <select
                value={formData.category_id}
                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                className="input-pill cursor-pointer"
              >
                {categories
                  .filter(c => c.type === 'MENU')
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1">HPP Menu (Rp)</label>
              <input
                type="number"
                min="0"
                value={formData.hpp_override}
                onChange={e => setFormData({ ...formData, hpp_override: e.target.value })}
                className="input-pill font-mono"
                placeholder="Otomatis dari resep / custom"
              />
              <span className="text-[10px] text-[#8C7A6B]">Bisa ditambahkan biaya nasi/packaging</span>
            </div>
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1">Harga Jual (Rp)</label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={formData.selling_price}
                onChange={e => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                className="input-pill font-mono font-bold text-[#D9482B]"
              />
            </div>
          </div>

          <ImageUploader
            value={formData.photo_url}
            onChange={(url) => setFormData({ ...formData, photo_url: url })}
            entityType="menu"
            entityName={formData.name || 'menu'}
            entityId={editingMenu?.id}
            label="Foto Menu Jual"
            helperText="Unggah foto menu (JPG, JPEG, PNG, WEBP maks 5 MB). File tersimpan di Google Drive dan URL tercatat di Google Sheets."
          />

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
              className="btn-pill-primary"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Menu Jual'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Menu Jual?"
        message="Menu jual ini akan dihapus dari daftar katalog kasir."
        confirmText="Hapus Menu"
        cancelText="Batal"
        isLoading={isSubmitting}
      />
    </div>
  );
};
