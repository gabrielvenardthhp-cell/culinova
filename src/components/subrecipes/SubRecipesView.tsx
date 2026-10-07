import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Layers, AlertCircle, Utensils } from 'lucide-react';
import { motion } from 'motion/react';
import { SubRecipe, Ingredient, Recipe, Unit } from '../../types';
import { formatRupiah, formatDate } from '../../lib/formatters';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SubRecipesViewProps {
  subRecipes: SubRecipe[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  units: Unit[];
  onAddSubRecipe: (data: any) => Promise<void>;
  onUpdateSubRecipe: (id: string, data: any) => Promise<void>;
  onDeleteSubRecipe: (id: string) => Promise<void>;
  isLoading: boolean;
}

export const SubRecipesView: React.FC<SubRecipesViewProps> = ({
  subRecipes,
  ingredients,
  recipes,
  units,
  onAddSubRecipe,
  onUpdateSubRecipe,
  onDeleteSubRecipe,
  isLoading,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubRecipe | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    yield_quantity: 20,
    yield_unit: 'Portion',
    ingredients: [] as { ingredient_id: string; quantity: number; unit: string }[],
  });

  const handleOpenAdd = () => {
    setFormError(null);
    setEditingSub(null);
    setFormData({
      code: `SUB-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: '',
      yield_quantity: 20,
      yield_unit: 'Portion',
      ingredients: [
        {
          ingredient_id: ingredients[0]?.id || '',
          quantity: 200,
          unit: 'Gram',
        },
      ],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: SubRecipe) => {
    setFormError(null);
    setEditingSub(sub);
    setFormData({
      code: sub.code,
      name: sub.name,
      yield_quantity: sub.yield_quantity,
      yield_unit: sub.yield_unit,
      ingredients: (sub.ingredients || []).map(i => ({
        ingredient_id: i.ingredient_id,
        quantity: i.quantity,
        unit: i.unit,
      })),
    });
    setIsModalOpen(true);
  };

  const handleAddRow = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          ingredient_id: ingredients[0]?.id || '',
          quantity: 100,
          unit: 'Gram',
        },
      ],
    }));
  };

  const handleRemoveRow = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Nama sub-resep wajib diisi.');
      return;
    }
    if (formData.yield_quantity <= 0) {
      setFormError('Yield harus lebih besar dari 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingSub) {
        await onUpdateSubRecipe(editingSub.id, formData);
      } else {
        await onAddSubRecipe(formData);
      }
      setIsModalOpen(false);
      setEditingSub(null);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan sub-resep.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      setIsSubmitting(true);
      await onDeleteSubRecipe(deletingId);
      setDeletingId(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus sub-resep.');
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
            Sub-Recipe Management
          </h2>
          <p className="text-xs text-[#735A47] mt-0.5">
            Komponen racikan pendukung (sambal, saus, bumbu dasar) yang dipakai pada berbagai resep utama.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn-pill-primary self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Sub-Resep</span>
        </button>
      </div>

      {/* Sub Recipe Grid */}
      {subRecipes.length === 0 ? (
        <div className="glass-solid py-16 text-center rounded-[28px] border border-white/70">
          <Layers className="w-8 h-8 text-[#8C7A6B] mx-auto mb-2" />
          <p className="text-xs text-[#735A47]">Belum ada sub-resep racikan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subRecipes.map(sub => {
            // Find recipes that use this sub-recipe
            const usedIn = recipes.filter(r =>
              r.ingredients?.some(ri => ri.ingredient_type === 'SUB_RECIPE' && ri.ingredient_id === sub.id)
            );

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="glass rounded-[20px] p-5 flex flex-col justify-between transition-shadow hover:shadow-md border border-white/80"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#735A47] bg-white/80 px-2.5 py-0.5 rounded-full border border-white/90">{sub.code}</span>
                    <span className="px-2.5 py-0.5 text-[10px] font-semibold badge-safe rounded-full">
                      {sub.status}
                    </span>
                  </div>

                  <h3 className="font-display text-base font-bold text-[#2B2118] mt-2.5">{sub.name}</h3>

                  <div className="mt-3 p-3 bg-white/70 backdrop-blur-md border border-stone-200/60 rounded-[16px] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] text-[#735A47] uppercase font-semibold">Total Cost Batch</div>
                      <div className="font-mono font-bold text-[#2B2118] tabular-nums mt-0.5">
                        {formatRupiah(sub.total_cost)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#735A47] uppercase font-semibold">Biaya per Porsi</div>
                      <div className="font-mono font-bold text-[#285A1D] tabular-nums mt-0.5">
                        {formatRupiah(sub.cost_per_unit)} / {sub.yield_unit}
                      </div>
                    </div>
                  </div>

                  {/* Ingredients Preview */}
                  <div className="mt-3.5 space-y-1">
                    <div className="text-[11px] font-semibold text-[#735A47]">Bahan Penyusun:</div>
                    <div className="text-xs text-[#5A4838] space-y-1">
                      {sub.ingredients?.slice(0, 4).map((item, i) => (
                        <div key={i} className="flex justify-between py-0.5 border-b border-stone-100/60">
                          <span>{item.ingredient_name || ingredients.find(ing => ing.id === item.ingredient_id)?.name}</span>
                          <span className="font-mono text-[#735A47]">{item.quantity} {item.unit}</span>
                        </div>
                      ))}
                      {(sub.ingredients?.length || 0) > 4 && (
                        <div className="text-[11px] text-[#8C7A6B] pt-0.5">
                          +{sub.ingredients!.length - 4} bahan lainnya
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Used In Recipes Indicator */}
                  <div className="mt-4 pt-3 border-t border-stone-100/70 text-xs text-[#735A47]">
                    <span>Digunakan di: </span>
                    {usedIn.length > 0 ? (
                      <span className="font-semibold text-[#2B2118]">
                        {usedIn.map(r => r.name).join(', ')}
                      </span>
                    ) : (
                      <span className="text-[#8C7A6B]">Belum ditautkan</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100/70 flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleOpenEdit(sub)}
                    className="p-1.5 text-[#735A47] hover:text-[#2B2118] hover:bg-white/80 rounded-full transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingId(sub.id)}
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
      )}

      {/* Modal Add/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSub ? `Edit Sub-Resep: ${editingSub.name}` : 'Buat Sub-Resep Baru'}
        subtitle="Masukkan racikan pendukung beserta yield porsi acuan."
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
              <label className="block font-semibold text-[#2B2118] mb-1">Kode Sub-Resep</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="input-pill font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1">Yield (Porsi)</label>
              <input
                type="number"
                min="1"
                required
                value={formData.yield_quantity}
                onChange={e => setFormData({ ...formData, yield_quantity: Number(e.target.value) })}
                className="input-pill font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#2B2118] mb-1">Nama Sub-Resep</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="input-pill"
              placeholder="Contoh: Sambal Bawang Spesial, Kaldu Ayam Kental"
            />
          </div>

          {/* Ingredients list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#2B2118]">Bahan Penyusun</label>
              <button
                type="button"
                onClick={handleAddRow}
                className="text-xs text-[#D9482B] font-semibold hover:underline"
              >
                + Tambah Baris
              </button>
            </div>

            <div className="border border-stone-200/60 rounded-[16px] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/70 border-b border-stone-200/60 text-[#735A47]">
                  <tr>
                    <th className="p-2.5">Bahan Baku</th>
                    <th className="p-2.5 w-28 text-right">Quantity</th>
                    <th className="p-2.5 w-24">Satuan</th>
                    <th className="p-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100/70">
                  {formData.ingredients.map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <select
                          value={row.ingredient_id}
                          onChange={e => {
                            const updated = [...formData.ingredients];
                            updated[idx].ingredient_id = e.target.value;
                            setFormData({ ...formData, ingredients: updated });
                          }}
                          className="input-pill py-1 text-xs"
                        >
                          {ingredients.map(ing => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({formatRupiah(ing.price_per_base_unit)}/{ing.base_unit})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          required
                          value={row.quantity}
                          onChange={e => {
                            const updated = [...formData.ingredients];
                            updated[idx].quantity = Number(e.target.value);
                            setFormData({ ...formData, ingredients: updated });
                          }}
                          className="input-pill py-1 text-right font-mono text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={row.unit}
                          onChange={e => {
                            const updated = [...formData.ingredients];
                            updated[idx].unit = e.target.value;
                            setFormData({ ...formData, ingredients: updated });
                          }}
                          className="input-pill py-1 text-xs"
                        >
                          {units.map(u => (
                            <option key={u.id} value={u.name}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="text-[#D9482B] hover:text-[#C23C21] p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              className="btn-pill-primary"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Sub-Resep'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Sub-Resep?"
        message="Sub-resep yang masih digunakan pada resep utama tidak dapat dihapus."
        confirmText="Hapus Sub-Resep"
        cancelText="Batal"
        isLoading={isSubmitting}
      />
    </div>
  );
};
