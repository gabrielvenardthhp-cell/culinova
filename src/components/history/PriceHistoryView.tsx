import React, { useState, useMemo } from 'react';
import { History, TrendingUp, TrendingDown, Search, Filter, ChevronDown } from 'lucide-react';
import { IngredientPriceHistory, Ingredient } from '../../types';
import { formatRupiah, formatDate, formatDateTime } from '../../lib/formatters';

interface PriceHistoryViewProps {
  priceHistory: IngredientPriceHistory[];
  ingredients: Ingredient[];
  initialIngredientId?: string | null;
  onClearFilter?: () => void;
}

export const PriceHistoryView: React.FC<PriceHistoryViewProps> = ({
  priceHistory,
  ingredients,
  initialIngredientId,
  onClearFilter,
}) => {
  const [selectedIngredient, setSelectedIngredient] = useState<string>(initialIngredientId || 'ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = useMemo(() => {
    return priceHistory.filter(item => {
      const matchIng = selectedIngredient === 'ALL' || item.ingredient_id === selectedIngredient;
      const matchSearch =
        (item.ingredient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reason.toLowerCase().includes(searchTerm.toLowerCase());
      return matchIng && matchSearch;
    });
  }, [priceHistory, selectedIngredient, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-stone-200/60">
        <div>
          <h2 className="font-display text-xl lg:text-[22px] font-bold tracking-tight text-[#2B2118]">
            Riwayat Perubahan Harga Bahan (Price History)
          </h2>
          <p className="text-xs text-[#735A47] mt-0.5">
            Log pergerakan harga beli supplier, tanggal efektif, dan alasan fluktuasi biaya bahan.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar: Bug 2 Fix (Responsive Grid, 44px Controls, Custom Chevrons) */}
      <div className="glass-solid p-3.5 sm:p-4 rounded-[20px] shadow-2xs border border-white/80 grid grid-cols-1 md:grid-cols-[1fr_minmax(200px,300px)] gap-3 items-center">
        <div className="relative w-full h-11">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari bahan, supplier, atau alasan..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-11 rounded-full pl-10 pr-4 bg-white/90 border border-stone-200/80 text-xs text-[#2B2118] placeholder:text-[#8C7A6B] focus:outline-none focus:border-[#D9482B] focus:ring-2 focus:ring-[#D9482B]/15 transition-all"
          />
        </div>

        <div className="relative w-full h-11">
          <select
            value={selectedIngredient}
            onChange={e => setSelectedIngredient(e.target.value)}
            className="w-full h-11 rounded-full appearance-none pl-4 pr-9 bg-white/90 border border-stone-200/80 text-xs font-semibold text-[#2B2118] cursor-pointer focus:outline-none focus:border-[#D9482B] focus:ring-2 focus:ring-[#D9482B]/15 transition-all truncate"
          >
            <option value="ALL">Semua Bahan Baku</option>
            {ingredients.map(ing => (
              <option key={ing.id} value={ing.id}>
                {ing.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-[#8C7A6B] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-solid rounded-[28px] overflow-hidden shadow-xs border border-white/70">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-stone-200/60 bg-white/60 text-[#735A47] font-semibold text-[10.5px] uppercase tracking-wider">
              <th className="py-3 px-4">Tanggal Efektif</th>
              <th className="py-3 px-4">Nama Bahan</th>
              <th className="py-3 px-4 text-right">Harga Lama</th>
              <th className="py-3 px-4 text-right">Harga Baru</th>
              <th className="py-3 px-4 text-right">Perubahan</th>
              <th className="py-3 px-4">Supplier</th>
              <th className="py-3 px-4">Alasan Perubahan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100/80">
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#8C7A6B]">
                  Tidak ada catatan riwayat harga.
                </td>
              </tr>
            ) : (
              filteredHistory.map(item => {
                const isIncrease = (item.change_percent || 0) > 0;
                return (
                  <tr key={item.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-4 text-[#735A47] font-mono whitespace-nowrap">
                      {formatDate(item.effective_date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#2B2118]">
                      {item.ingredient_name || 'Bahan'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#8C7A6B]">
                      {formatRupiah(item.old_price)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#2B2118]">
                      {formatRupiah(item.new_price)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${
                          isIncrease
                            ? 'badge-danger'
                            : 'badge-safe'
                        }`}
                      >
                        {isIncrease ? (
                          <TrendingUp className="w-3 h-3 text-[#9E2A14]" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-[#285A1D]" />
                        )}
                        <span>
                          {isIncrease ? '+' : ''}
                          {item.change_percent ? item.change_percent.toFixed(1) : 0}%
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#735A47]">{item.supplier}</td>
                    <td className="py-3 px-4 text-[#5A4838] max-w-xs">{item.reason}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
