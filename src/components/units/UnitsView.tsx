import React, { useState } from 'react';
import { Plus, Scale, AlertCircle } from 'lucide-react';
import { Unit } from '../../types';
import { Modal } from '../common/Modal';

interface UnitsViewProps {
  units: Unit[];
  onAddUnit: (data: Partial<Unit>) => Promise<void>;
  isLoading: boolean;
}

export const UnitsView: React.FC<UnitsViewProps> = ({ units, onAddUnit, isLoading }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    base_unit: '',
    conversion_factor: 1,
    type: 'WEIGHT' as Unit['type'],
  });

  const handleOpenAdd = () => {
    setFormError(null);
    setFormData({
      name: '',
      base_unit: 'Gram',
      conversion_factor: 1000,
      type: 'WEIGHT',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Nama satuan tidak boleh kosong.');
      return;
    }
    if (formData.conversion_factor <= 0) {
      setFormError('Faktor konversi harus lebih besar dari 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddUnit({
        ...formData,
        conversion_factor: Number(formData.conversion_factor),
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menambahkan satuan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-stone-200/60">
        <div>
          <h2 className="font-display text-xl lg:text-[22px] font-bold tracking-tight text-[#2B2118]">
            Master Satuan & Konversi (Units)
          </h2>
          <p className="text-xs text-[#735A47] mt-0.5">
            Daftar satuan unit pembelian dan faktor konversi otomatis ke satuan terkecil (Base Unit).
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn-pill-primary self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Satuan</span>
        </button>
      </div>

      <div className="glass-solid rounded-[28px] overflow-hidden shadow-xs border border-white/70">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-stone-200/60 bg-white/60 text-[#735A47] font-semibold text-[10.5px] uppercase tracking-wider">
              <th className="py-3 px-4">Nama Satuan</th>
              <th className="py-3 px-4">Tipe Satuan</th>
              <th className="py-3 px-4">Base Unit Acuan</th>
              <th className="py-3 px-4 text-right">Faktor Konversi</th>
              <th className="py-3 px-4">Rumus Konversi</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100/80">
            {units.map(unit => (
              <tr key={unit.id} className="hover:bg-white/60 transition-colors">
                <td className="py-3 px-4 font-bold text-[#2B2118]">{unit.name}</td>
                <td className="py-3 px-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-stone-100 text-[#735A47] border border-stone-200/60">
                    {unit.type}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono font-semibold text-[#285A1D]">
                  {unit.base_unit || unit.name}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#2B2118]">
                  {unit.conversion_factor.toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-4 font-mono text-[#735A47]">
                  1 {unit.name} = {unit.conversion_factor.toLocaleString('id-ID')} {unit.base_unit || unit.name}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-medium badge-safe">
                    {unit.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Satuan Baru"
        subtitle="Tetapkan nama satuan, basis konversi, dan faktor pengali."
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-[14px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#2B2118] mb-1.5">Nama Satuan</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="input-pill"
              placeholder="Contoh: Kaleng 400g, Galon 19L"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1.5">Tipe Satuan</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className="input-pill cursor-pointer"
              >
                <option value="WEIGHT">WEIGHT (Berat)</option>
                <option value="VOLUME">VOLUME (Volume)</option>
                <option value="UNIT">UNIT (Kemasan/Pcs)</option>
                <option value="PORTION">PORTION (Porsi)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1.5">Base Unit Terkecil</label>
              <input
                type="text"
                required
                value={formData.base_unit}
                onChange={e => setFormData({ ...formData, base_unit: e.target.value })}
                className="input-pill"
                placeholder="Gram / Ml / Pcs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#2B2118] mb-1.5">Faktor Konversi ke Base Unit</label>
            <input
              type="number"
              min="0.001"
              step="any"
              required
              value={formData.conversion_factor}
              onChange={e => setFormData({ ...formData, conversion_factor: Number(e.target.value) })}
              className="input-pill font-mono"
            />
            <p className="text-[11px] text-[#735A47] mt-1.5">
              Contoh: 1 Kg = 1000 Gram (faktor = 1000). 1 Sendok Makan = 15 Gram (faktor = 15).
            </p>
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Satuan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
