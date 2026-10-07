import React from 'react';
import {
  TrendingUp,
  Percent,
  Wheat,
  UtensilsCrossed,
  BookOpen,
  FolderTree,
  AlertTriangle,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Filter,
  Sparkles,
} from 'lucide-react';
import { DashboardData } from '../../lib/api';
import { Category } from '../../types';
import { formatRupiah, formatPercent, formatDate } from '../../lib/formatters';
import heroDishImage from '../../assets/images/dish_nasi_goreng_1791109832554.jpg';

interface DashboardViewProps {
  data: DashboardData | null;
  isLoading: boolean;
  onNavigateTab: (tab: any) => void;
  onSelectRecipe: (id: string) => void;
  targetFoodCost: number;
  categories?: Category[];
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  isLoading,
  onNavigateTab,
  onSelectRecipe,
  targetFoodCost = 35,
  categories = [],
  selectedCategory = 'ALL',
  onSelectCategory,
}) => {
  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 bg-stone-200/60 rounded-[28px]"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-28 bg-white/60 rounded-[20px]"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-white/60 rounded-[28px]"></div>
          <div className="h-64 bg-white/60 rounded-[28px]"></div>
        </div>
      </div>
    );
  }

  const { kpis, recentRecipes, costAlerts, highestFoodCostMenus } = data;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat pagi';
    if (hour < 18) return 'Selamat siang';
    return 'Selamat malam';
  };

  const recipeCategories = categories.filter(c => c.type === 'RECIPE');

  return (
    <div className="space-y-6">
      {/* ========================================================
          HERO CARD DENGAN FOTO HIDANGAN BESAR & PANEL KACA MELAYANG
          ======================================================== */}
      <div className="relative rounded-[28px] overflow-hidden shadow-lg border border-white/70 min-h-[380px] lg:min-h-[420px] flex flex-col justify-between p-6 sm:p-8 lg:p-9 bg-[#2B2118]">
        {/* Foto Hidangan Besar */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 hover:scale-105"
          style={{
            backgroundImage: `url(${heroDishImage})`,
          }}
        />

        {/* Lapisan Gradasi Krem-Arang agar teks & kaca terbaca jelas */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#2B2118]/90 via-[#2B2118]/45 to-[#2B2118]/30 pointer-events-none" />

        {/* Top Header di dalam Hero */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white/90 text-xs font-medium mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-[#F6E1A8]" />
              <span>{getGreeting()}, Chef Gabriel</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
              Dapur & Efisiensi Food Cost
            </h2>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl mt-1 leading-relaxed">
              Pantau formulasi resep, margin penjualan, dan pergerakan harga pasar bahan baku secara akurat.
            </p>
          </div>

          {/* Action Pills & Category Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onSelectCategory && (
              <div className="flex items-center gap-1.5 glass rounded-full px-3.5 py-1.5 text-xs text-[#2B2118] font-medium shadow-xs">
                <Filter className="w-3.5 h-3.5 text-[#735A47]" />
                <select
                  value={selectedCategory}
                  onChange={e => onSelectCategory(e.target.value)}
                  className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Kategori</option>
                  {recipeCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => onNavigateTab('add-recipe')}
              className="btn-pill-primary shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Resep</span>
            </button>

            <button
              onClick={() => onNavigateTab('reports')}
              className="btn-pill-secondary text-[#2B2118] bg-white/85"
            >
              <span>Laporan HPP</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Panel Kaca Ringkasan (Menumpuk di atas Foto Hidangan) */}
        <div className="relative z-10 flex overflow-x-auto sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-6 pb-2 sm:pb-0 snap-x snap-mandatory sm:snap-none no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0">
          {/* Card 1: Bahan Baku */}
          <div className="glass rounded-[20px] p-3.5 text-[#2B2118] hover:-translate-y-1 transition-transform min-w-[150px] sm:min-w-0 snap-start shrink-0 sm:shrink flex-1 sm:flex-initial">
            <div className="flex items-center justify-between text-[#735A47] mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Bahan Baku</span>
              <div className="w-6 h-6 rounded-full bg-white/70 flex items-center justify-center">
                <Wheat className="w-3.5 h-3.5 text-[#735A47]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#2B2118]">
              {kpis.totalIngredients}
            </div>
            <div className="text-[10px] text-[#735A47] mt-0.5">Bahan baku aktif</div>
          </div>

          {/* Card 2: Resep */}
          <div className="glass rounded-[20px] p-3.5 text-[#2B2118] hover:-translate-y-1 transition-transform min-w-[150px] sm:min-w-0 snap-start shrink-0 sm:shrink flex-1 sm:flex-initial">
            <div className="flex items-center justify-between text-[#735A47] mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Bank Resep</span>
              <div className="w-6 h-6 rounded-full bg-white/70 flex items-center justify-center">
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#735A47]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#2B2118]">
              {kpis.totalRecipes}
            </div>
            <div className="text-[10px] text-[#735A47] mt-0.5">Formula tersimpan</div>
          </div>

          {/* Card 3: Menu Jual */}
          <div className="glass rounded-[20px] p-3.5 text-[#2B2118] hover:-translate-y-1 transition-transform min-w-[150px] sm:min-w-0 snap-start shrink-0 sm:shrink flex-1 sm:flex-initial">
            <div className="flex items-center justify-between text-[#735A47] mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Menu POS</span>
              <div className="w-6 h-6 rounded-full bg-white/70 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-[#735A47]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#2B2118]">
              {kpis.totalMenus}
            </div>
            <div className="text-[10px] text-[#735A47] mt-0.5">Siap dijual</div>
          </div>

          {/* Card 4: Kategori */}
          <div className="glass rounded-[20px] p-3.5 text-[#2B2118] hover:-translate-y-1 transition-transform min-w-[150px] sm:min-w-0 snap-start shrink-0 sm:shrink flex-1 sm:flex-initial">
            <div className="flex items-center justify-between text-[#735A47] mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Kategori</span>
              <div className="w-6 h-6 rounded-full bg-white/70 flex items-center justify-center">
                <FolderTree className="w-3.5 h-3.5 text-[#735A47]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#2B2118]">
              {kpis.totalCategories ?? categories.filter(c => c.status === 'ACTIVE').length}
            </div>
            <div className="text-[10px] text-[#735A47] mt-0.5">Klasifikasi dapur</div>
          </div>

          {/* Card 5: Food Cost */}
          <div className="glass rounded-[20px] p-3.5 text-[#2B2118] hover:-translate-y-1 transition-transform min-w-[150px] sm:min-w-0 snap-start shrink-0 sm:shrink flex-1 sm:flex-initial">
            <div className="flex items-center justify-between text-[#735A47] mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Food Cost</span>
              <div className="w-6 h-6 rounded-full bg-[#E0A526]/20 flex items-center justify-center">
                <Percent className="w-3.5 h-3.5 text-[#825C05]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#2B2118]">
              {formatPercent(kpis.avgFoodCost)}
            </div>
            <div className="text-[10px] text-[#735A47] mt-0.5">
              Target: <strong className="font-mono text-[#4F8A3C]">{targetFoodCost}%</strong>
            </div>
          </div>

          {/* Card 6: Margin */}
          <div className="glass rounded-[20px] p-3.5 text-[#2B2118] hover:-translate-y-1 transition-transform min-w-[150px] sm:min-w-0 snap-start shrink-0 sm:shrink flex-1 sm:flex-initial">
            <div className="flex items-center justify-between text-[#735A47] mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Avg Margin</span>
              <div className="w-6 h-6 rounded-full bg-[#4F8A3C]/20 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-[#285A1D]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#285A1D]">
              {formatPercent(kpis.avgMargin)}
            </div>
            <div className="text-[10px] text-[#735A47] mt-0.5">Gross profit sehat</div>
          </div>
        </div>
      </div>

      {/* ========================================================
          CHARTS SECTION (GLASS-SOLID KONTEN TINGGI BACA)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Food Cost Overview */}
        <div className="glass-solid rounded-[28px] p-6 lg:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/60">
              <div>
                <h3 className="font-display text-base font-bold text-[#2B2118]">Analisis Food Cost</h3>
                <p className="text-xs text-[#735A47] mt-0.5">
                  Rasio Food Cost (%) per menu dibanding target benchmark ({targetFoodCost}%)
                </p>
              </div>
              <span className="badge-warn font-mono">
                Batas: {targetFoodCost}%
              </span>
            </div>

            {/* Visual Bar Chart */}
            <div className="mt-5 space-y-4">
              {highestFoodCostMenus.map(m => {
                const isOverTarget = m.food_cost > targetFoodCost;
                return (
                  <div key={m.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-[#2B2118] truncate max-w-[200px]">{m.name}</span>
                      <span className="font-mono font-bold tabular-nums text-[#2B2118]">
                        {formatPercent(m.food_cost)}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-stone-200/50 rounded-full overflow-hidden relative border border-stone-200/50">
                      {/* Target threshold indicator line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-[#2B2118] z-10"
                        style={{ left: `${Math.min(targetFoodCost, 100)}%` }}
                        title={`Target: ${targetFoodCost}%`}
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOverTarget ? 'bg-[#D9482B]' : 'bg-[#4F8A3C]'
                        }`}
                        style={{ width: `${Math.min(m.food_cost, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-[#735A47]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4F8A3C]"></span>
                Sehat (&le;{targetFoodCost}%)
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D9482B]"></span>
                Waspada (&gt;{targetFoodCost}%)
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('analytics')}
              className="text-[#D9482B] font-bold hover:underline inline-flex items-center gap-1"
            >
              Detail Analytics <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Chart 2: Margin Overview */}
        <div className="glass-solid rounded-[28px] p-6 lg:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/60">
              <div>
                <h3 className="font-display text-base font-bold text-[#2B2118]">Margin Keuntungan</h3>
                <p className="text-xs text-[#735A47] mt-0.5">
                  Gross Profit Margin per menu penjualan aktif
                </p>
              </div>
              <span className="badge-safe font-mono">
                Avg: {formatPercent(kpis.avgMargin)}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {highestFoodCostMenus.map(m => (
                <div key={m.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#2B2118] truncate max-w-[200px]">{m.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#735A47]">{formatRupiah(m.selling_price - m.hpp)}</span>
                      <span className="font-mono font-bold tabular-nums text-[#285A1D]">
                        {formatPercent(m.margin)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-stone-200/50 rounded-full overflow-hidden border border-stone-200/50">
                    <div
                      className="h-full rounded-full bg-[#4F8A3C] transition-all duration-300"
                      style={{ width: `${Math.min(m.margin, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-[#735A47]">
            <span>Semua formula menu terverifikasi</span>
            <button
              onClick={() => onNavigateTab('sales-menus')}
              className="text-[#D9482B] font-bold hover:underline inline-flex items-center gap-1"
            >
              Kelola Menu Jual <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          ALERTS AND RECENTLY UPDATED RECIPES
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Alert Section */}
        <div className="glass-solid rounded-[28px] p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-stone-200/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#E0A526]/15 text-[#825C05] flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-display text-sm font-bold text-[#2B2118]">Cost Alert</h3>
            </div>
            <button
              onClick={() => onNavigateTab('price-history')}
              className="text-xs text-[#D9482B] hover:underline font-bold"
            >
              Riwayat
            </button>
          </div>
          <p className="text-xs text-[#735A47] mb-4">
            Bahan baku dengan lonjakan harga yang mempengaruhi kalkulasi HPP resep.
          </p>

          {costAlerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8C7A6B]">
              Tidak ada lonjakan harga bahan baku signifikan saat ini.
            </div>
          ) : (
            <div className="space-y-3">
              {costAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-[18px] bg-white/70 border border-[#F6E1A8] text-xs shadow-2xs space-y-1.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-[#2B2118]">{alert.ingredient_name}</div>
                      <div className="text-[11px] text-[#735A47] mt-0.5">
                        {formatRupiah(alert.old_price)} &rarr;{' '}
                        <span className="font-bold text-[#2B2118]">{formatRupiah(alert.new_price)}</span>
                      </div>
                    </div>
                    <span className="badge-danger font-mono font-bold text-[10px]">
                      +{alert.increase_pct}%
                    </span>
                  </div>

                  {alert.affected_recipes.length > 0 && (
                    <div className="pt-1.5 border-t border-stone-200/50 text-[11px] text-[#5A4838]">
                      <span className="text-[#8C7A6B]">Dampak: </span>
                      {alert.affected_recipes.map((r, i) => (
                        <button
                          key={r.recipe_id}
                          onClick={() => onSelectRecipe(r.recipe_id)}
                          className="font-semibold text-[#D9482B] hover:underline"
                        >
                          {r.recipe_name} ({formatRupiah(r.old_hpp)} &rarr; {formatRupiah(r.new_hpp)})
                          {i < alert.affected_recipes.length - 1 ? ', ' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Updated Recipes Table */}
        <div className="glass-solid rounded-[28px] p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-200/60">
            <div>
              <h3 className="font-display text-sm font-bold text-[#2B2118]">Resep Terakhir Diperbarui</h3>
              <p className="text-xs text-[#735A47] mt-0.5">
                Kalkulasi HPP dan Food Cost terbaru dari bank formula
                {selectedCategory !== 'ALL' && (
                  <span className="text-[#D9482B] font-semibold ml-1">
                    (Filter: {categories.find(c => c.id === selectedCategory)?.name})
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('recipes')}
              className="text-xs font-bold text-[#D9482B] hover:underline"
            >
              Lihat Semua Resep &rarr;
            </button>
          </div>

          {recentRecipes.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-xs text-[#8C7A6B]">Belum ada resep dalam kategori ini.</p>
              <button
                onClick={() => onNavigateTab('add-recipe')}
                className="btn-pill-primary"
              >
                Buat Resep Pertama
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200/70 text-[#735A47] font-semibold text-[11px]">
                    <th className="py-2.5 pr-3">Nama Resep</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-right">HPP</th>
                    <th className="py-2.5 px-3 text-right">Food Cost</th>
                    <th className="py-2.5 px-3 text-right">Margin</th>
                    <th className="py-2.5 pl-3 text-right">Diperbarui</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/40">
                  {recentRecipes.map(recipe => (
                    <tr
                      key={recipe.id}
                      onClick={() => onSelectRecipe(recipe.id)}
                      className="hover:bg-white/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-[#2B2118] group-hover:text-[#D9482B] flex items-center gap-2.5">
                          <img
                            src={recipe.photo_url}
                            alt={recipe.name}
                            className="w-8 h-8 rounded-full object-cover border border-white/80 shadow-2xs shrink-0"
                            onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                          <span className="truncate max-w-[180px] font-bold">{recipe.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#735A47]">
                        {recipe.category}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium tabular-nums text-[#2B2118]">
                        {formatRupiah(recipe.hpp)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                        <span className={recipe.food_cost <= targetFoodCost ? 'text-[#285A1D]' : 'text-[#D9482B]'}>
                          {formatPercent(recipe.food_cost)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#285A1D]">
                        {formatPercent(recipe.margin)}
                      </td>
                      <td className="py-2.5 pl-3 text-right text-[11px] text-[#8C7A6B]">
                        {formatDate(recipe.updated)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
