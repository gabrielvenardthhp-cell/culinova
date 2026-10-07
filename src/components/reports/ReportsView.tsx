import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, Printer, Download, Filter, FileText } from 'lucide-react';
import { Recipe, Ingredient, SalesMenu, IngredientPriceHistory, Category } from '../../types';
import { formatRupiah, formatPercent, formatDate } from '../../lib/formatters';

interface ReportsViewProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  menus: SalesMenu[];
  priceHistory: IngredientPriceHistory[];
  categories: Category[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  recipes,
  ingredients,
  menus,
  priceHistory,
  categories,
}) => {
  const [reportType, setReportType] = useState<
    'recipes' | 'ingredients' | 'hpp' | 'food_cost' | 'margin' | 'price_history'
  >('hpp');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Filtered data by category
  const filteredRecipes = useMemo(() => {
    if (selectedCategory === 'ALL') return recipes;
    return recipes.filter(r => r.category_id === selectedCategory);
  }, [recipes, selectedCategory]);

  const filteredIngredients = useMemo(() => {
    if (selectedCategory === 'ALL') return ingredients;
    return ingredients.filter(i => i.category_id === selectedCategory);
  }, [ingredients, selectedCategory]);

  const filteredMenus = useMemo(() => {
    if (selectedCategory === 'ALL') return menus;
    return menus.filter(m => m.category_id === selectedCategory);
  }, [menus, selectedCategory]);

  const exportToCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `Culinova_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (reportType === 'recipes' || reportType === 'hpp') {
      headers = ['Kode', 'Nama Resep', 'Kategori', 'Yield', 'HPP Batch (Rp)', 'HPP Porsi (Rp)', 'Harga Jual (Rp)', 'Food Cost (%)', 'Margin (%)', 'Status'];
      rows = filteredRecipes.map(r => [
        r.code,
        `"${r.name.replace(/"/g, '""')}"`,
        categories.find(c => c.id === r.category_id)?.name || '-',
        `${r.yield_quantity} ${r.yield_unit}`,
        r.total_ingredient_cost,
        r.hpp_per_portion,
        r.selling_price,
        r.food_cost_pct,
        r.margin_pct,
        r.status,
      ]);
    } else if (reportType === 'ingredients') {
      headers = ['Kode', 'Nama Bahan', 'Kategori', 'Satuan', 'Harga Beli (Rp)', 'Base Unit', 'Harga / Base Unit (Rp)', 'Supplier', 'Status'];
      rows = filteredIngredients.map(i => [
        i.code,
        `"${i.name.replace(/"/g, '""')}"`,
        categories.find(c => c.id === i.category_id)?.name || '-',
        i.unit_id,
        i.purchase_price,
        i.base_unit,
        i.price_per_base_unit,
        `"${i.supplier.replace(/"/g, '""')}"`,
        i.status,
      ]);
    } else if (reportType === 'food_cost' || reportType === 'margin') {
      headers = ['Kode Menu', 'Nama Menu Jual', 'Resep', 'HPP (Rp)', 'Harga Jual (Rp)', 'Food Cost (%)', 'Gross Profit (Rp)', 'Margin (%)'];
      rows = filteredMenus.map(m => [
        m.code,
        `"${m.name.replace(/"/g, '""')}"`,
        `"${(m.recipe_name || '').replace(/"/g, '""')}"`,
        m.hpp,
        m.selling_price,
        m.food_cost,
        m.gross_profit,
        m.margin,
      ]);
    } else if (reportType === 'price_history') {
      headers = ['Nama Bahan', 'Harga Lama (Rp)', 'Harga Baru (Rp)', 'Perubahan (%)', 'Supplier', 'Alasan', 'Tanggal'];
      rows = priceHistory.map(ph => [
        `"${(ph.ingredient_name || '').replace(/"/g, '""')}"`,
        ph.old_price,
        ph.new_price,
        ph.change_percent || 0,
        `"${ph.supplier.replace(/"/g, '""')}"`,
        `"${ph.reason.replace(/"/g, '""')}"`,
        ph.effective_date,
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-stone-200/60">
        <div>
          <h2 className="font-display text-xl lg:text-[22px] font-bold tracking-tight text-[#2B2118]">
            Laporan & Ekspor Data (Reports)
          </h2>
          <p className="text-xs text-[#735A47] mt-0.5">
            Unduh laporan berkala HPP, Food Cost, pergerakan harga supplier, dan katalog menu siap cetak.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handlePrint}
            className="btn-pill-secondary inline-flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-[#735A47]" />
            <span>Print Laporan</span>
          </button>
          <button
            onClick={exportToCSV}
            className="btn-pill-primary inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Select Report Type Bar & Category Filter */}
      <div className="glass-solid flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-3 rounded-[20px] shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'hpp', label: 'HPP Analysis Report' },
            { id: 'food_cost', label: 'Food Cost Report' },
            { id: 'margin', label: 'Margin Report' },
            { id: 'recipes', label: 'Recipe List' },
            { id: 'ingredients', label: 'Ingredient List' },
            { id: 'price_history', label: 'Price Change Report' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-180 ${
                reportType === tab.id
                  ? 'bg-[#D9482B] text-white shadow-xs'
                  : 'bg-white/70 text-[#735A47] hover:bg-white hover:text-[#2B2118] border border-white/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 px-2">
          <Filter className="w-3.5 h-3.5 text-[#8C7A6B]" />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="input-pill text-xs w-auto px-3 py-1.5 text-[#2B2118] font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Table View */}
      <div id="printable-report-area" className="glass-solid rounded-[28px] p-6 space-y-4 shadow-xs border border-white/70">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200/60">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#8C7A6B] font-bold">
              CULINOVA CULINARY REPORT
            </div>
            <h3 className="font-display text-base font-bold text-[#2B2118] uppercase tracking-tight">
              {reportType.replace('_', ' ')}
            </h3>
            {selectedCategory !== 'ALL' && (
              <p className="text-xs text-[#285A1D] font-semibold mt-0.5">
                Kategori: {categories.find(c => c.id === selectedCategory)?.name}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-[#735A47]">
            <div>Tanggal Dokumen: {formatDate(new Date().toISOString())}</div>
            <div className="text-[#285A1D] font-semibold">Status Basis Data: Google Sheets Synced</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200/60 bg-white/60 text-[#735A47] font-semibold text-[10.5px] uppercase tracking-wider">
                {reportType === 'hpp' || reportType === 'recipes' ? (
                  <>
                    <th className="py-2.5 px-3">Kode</th>
                    <th className="py-2.5 px-3">Nama Resep</th>
                    <th className="py-2.5 px-3">Yield</th>
                    <th className="py-2.5 px-3 text-right">HPP Batch</th>
                    <th className="py-2.5 px-3 text-right">HPP / Porsi</th>
                    <th className="py-2.5 px-3 text-right">Harga Jual</th>
                    <th className="py-2.5 px-3 text-right">Food Cost</th>
                    <th className="py-2.5 px-3 text-right">Margin</th>
                  </>
                ) : reportType === 'ingredients' ? (
                  <>
                    <th className="py-2.5 px-3">Kode</th>
                    <th className="py-2.5 px-3">Nama Bahan</th>
                    <th className="py-2.5 px-3 text-right">Harga Beli</th>
                    <th className="py-2.5 px-3 text-right">Price / Base Unit</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </>
                ) : reportType === 'food_cost' || reportType === 'margin' ? (
                  <>
                    <th className="py-2.5 px-3">Kode Menu</th>
                    <th className="py-2.5 px-3">Nama Menu Jual</th>
                    <th className="py-2.5 px-3 text-right">HPP</th>
                    <th className="py-2.5 px-3 text-right">Harga Jual</th>
                    <th className="py-2.5 px-3 text-right">Food Cost %</th>
                    <th className="py-2.5 px-3 text-right">Gross Profit</th>
                    <th className="py-2.5 px-3 text-right">Margin %</th>
                  </>
                ) : (
                  <>
                    <th className="py-2.5 px-3">Bahan</th>
                    <th className="py-2.5 px-3 text-right">Harga Lama</th>
                    <th className="py-2.5 px-3 text-right">Harga Baru</th>
                    <th className="py-2.5 px-3 text-right">Perubahan</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3">Alasan</th>
                    <th className="py-2.5 px-3">Tanggal</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100/80">
              {reportType === 'hpp' || reportType === 'recipes' ? (
                filteredRecipes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#8C7A6B]">
                      Tidak ada resep pada kategori ini.
                    </td>
                  </tr>
                ) : (
                  filteredRecipes.map(r => (
                    <tr key={r.id} className="hover:bg-white/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-[#735A47]">{r.code}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#2B2118]">{r.name}</td>
                      <td className="py-2.5 px-3 text-[#735A47]">{r.yield_quantity} {r.yield_unit}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#735A47]">{formatRupiah(r.total_ingredient_cost)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#2B2118]">{formatRupiah(r.hpp_per_portion)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#D9482B]">{formatRupiah(r.selling_price)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-[#825C05]">{formatPercent(r.food_cost_pct)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-[#285A1D]">{formatPercent(r.margin_pct)}</td>
                    </tr>
                  ))
                )
              ) : reportType === 'ingredients' ? (
                filteredIngredients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#8C7A6B]">
                      Tidak ada bahan pada kategori ini.
                    </td>
                  </tr>
                ) : (
                  filteredIngredients.map(i => (
                    <tr key={i.id} className="hover:bg-white/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-[#735A47]">{i.code}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#2B2118]">{i.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#2B2118]">{formatRupiah(i.purchase_price)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-[#285A1D]">{formatRupiah(i.price_per_base_unit)} / {i.base_unit}</td>
                      <td className="py-2.5 px-3 text-[#735A47]">{i.supplier}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium badge-safe">
                          {i.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )
              ) : reportType === 'food_cost' || reportType === 'margin' ? (
                filteredMenus.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#8C7A6B]">
                      Tidak ada menu pada kategori ini.
                    </td>
                  </tr>
                ) : (
                  filteredMenus.map(m => (
                    <tr key={m.id} className="hover:bg-white/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-[#735A47]">{m.code}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#2B2118]">{m.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#2B2118]">{formatRupiah(m.hpp)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#D9482B] font-bold">{formatRupiah(m.selling_price)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-[#825C05]">{formatPercent(m.food_cost)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#285A1D] font-medium">{formatRupiah(m.gross_profit)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-[#285A1D]">{formatPercent(m.margin)}</td>
                    </tr>
                  ))
                )
              ) : (
                priceHistory.map(ph => (
                  <tr key={ph.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-[#2B2118]">{ph.ingredient_name}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#8C7A6B]">{formatRupiah(ph.old_price)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#2B2118]">{formatRupiah(ph.new_price)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#D9482B]">+{ph.change_percent}%</td>
                    <td className="py-2.5 px-3 text-[#735A47]">{ph.supplier}</td>
                    <td className="py-2.5 px-3 text-[#5A4838]">{ph.reason}</td>
                    <td className="py-2.5 px-3 text-[#735A47] font-mono">{formatDate(ph.effective_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
