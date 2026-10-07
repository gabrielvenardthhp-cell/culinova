import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Percent, ArrowUpRight, ArrowDownRight, ShieldCheck } from 'lucide-react';
import { SalesMenu, Recipe, AppSettings } from '../../types';
import { formatRupiah, formatPercent } from '../../lib/formatters';

interface AnalyticsViewProps {
  menus: SalesMenu[];
  recipes: Recipe[];
  settings: AppSettings;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ menus, recipes, settings }) => {
  const activeMenus = useMemo(() => menus.filter(m => m.status === 'ACTIVE'), [menus]);

  const fcStats = useMemo(() => {
    if (activeMenus.length === 0) return { avg: 0, lowest: 0, highest: 0 };
    const values = activeMenus.map(m => m.food_cost);
    const sum = values.reduce((acc, v) => acc + v, 0);
    return {
      avg: Number((sum / values.length).toFixed(1)),
      lowest: Math.min(...values),
      highest: Math.max(...values),
    };
  }, [activeMenus]);

  const marginStats = useMemo(() => {
    if (activeMenus.length === 0) return { avg: 0, lowest: 0, highest: 0 };
    const values = activeMenus.map(m => m.margin);
    const sum = values.reduce((acc, v) => acc + v, 0);
    return {
      avg: Number((sum / values.length).toFixed(1)),
      lowest: Math.min(...values),
      highest: Math.max(...values),
    };
  }, [activeMenus]);

  const getFoodCostBadge = (fc: number) => {
    if (fc < settings.food_cost_threshold_low) {
      return { label: 'Aman (Sangat Hemat)', color: 'badge-safe' };
    }
    if (fc <= settings.food_cost_threshold_high) {
      return { label: 'Sehat (Ideal)', color: 'badge-safe' };
    }
    return { label: 'Waspada (Tinggi)', color: 'badge-danger' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-stone-200/60">
        <h2 className="font-display text-xl lg:text-[22px] font-bold tracking-tight text-[#2B2118]">
          Culinary Analytics: Food Cost & Profit Margin
        </h2>
        <p className="text-xs text-[#735A47] mt-0.5">
          Tolok ukur profitabilitas menu, perbandingan Food Cost rasio terhadap target ({settings.food_cost_target}%), dan batas ambang sehat.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="glass p-4 rounded-[20px] text-[#2B2118]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#735A47]">Avg Food Cost</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#2B2118] mt-1">
            {formatPercent(fcStats.avg)}
          </div>
          <div className="text-[10px] text-[#735A47] mt-0.5">Target: <span className="font-semibold text-[#4F8A3C]">{settings.food_cost_target}%</span></div>
        </div>

        <div className="glass p-4 rounded-[20px] text-[#2B2118]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#735A47]">Lowest Food Cost</div>
          <div className="text-2xl font-bold text-[#285A1D] font-mono tabular-nums mt-1">
            {formatPercent(fcStats.lowest)}
          </div>
          <div className="text-[10px] text-[#4F8A3C] mt-0.5 font-medium">Margin tertinggi</div>
        </div>

        <div className="glass p-4 rounded-[20px] text-[#2B2118]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#735A47]">Highest Food Cost</div>
          <div className="text-2xl font-bold text-[#D9482B] font-mono tabular-nums mt-1">
            {formatPercent(fcStats.highest)}
          </div>
          <div className="text-[10px] text-[#D9482B] mt-0.5 font-medium">Perlu evaluasi</div>
        </div>

        <div className="glass p-4 rounded-[20px] text-[#2B2118]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#735A47]">Avg Gross Margin</div>
          <div className="text-2xl font-bold text-[#285A1D] font-mono tabular-nums mt-1">
            {formatPercent(marginStats.avg)}
          </div>
          <div className="text-[10px] text-[#735A47] mt-0.5">Target: {settings.margin_target}%</div>
        </div>

        <div className="glass p-4 rounded-[20px] text-[#2B2118]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#735A47]">Highest Margin</div>
          <div className="text-2xl font-bold text-[#285A1D] font-mono tabular-nums mt-1">
            {formatPercent(marginStats.highest)}
          </div>
          <div className="text-[10px] text-[#735A47] mt-0.5">Paling menguntungkan</div>
        </div>

        <div className="glass p-4 rounded-[20px] text-[#2B2118]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#735A47]">Lowest Margin</div>
          <div className="text-2xl font-bold text-[#2B2118] font-mono tabular-nums mt-1">
            {formatPercent(marginStats.lowest)}
          </div>
          <div className="text-[10px] text-[#735A47] mt-0.5">Margin paling tipis</div>
        </div>
      </div>

      {/* Main Charts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Food Cost Breakdown */}
        <div className="glass-solid p-5 lg:p-6 rounded-[28px] space-y-4 shadow-xs border border-white/70">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60">
            <div>
              <h3 className="font-display text-sm font-bold text-[#2B2118]">Distribusi Food Cost per Menu</h3>
              <p className="text-xs text-[#735A47] mt-0.5">
                Batas ambang ideal: &lt;{settings.food_cost_threshold_high}%
              </p>
            </div>
            <span className="font-mono text-xs text-[#285A1D] bg-white/80 px-2.5 py-1 rounded-full border border-white/90 font-semibold shadow-2xs">
              Benchmark: {settings.food_cost_target}%
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {activeMenus.map(m => {
              const badge = getFoodCostBadge(m.food_cost);
              const isOver = m.food_cost > settings.food_cost_threshold_high;
              return (
                <div key={m.id} className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#2B2118]">{m.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="font-mono font-bold text-[#2B2118] tabular-nums">
                        {formatPercent(m.food_cost)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-stone-200/50 rounded-full overflow-hidden relative border border-stone-200/50">
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-[#2B2118] z-10"
                      style={{ left: `${settings.food_cost_target}%` }}
                    />
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOver
                          ? 'bg-[#D9482B]'
                          : m.food_cost < settings.food_cost_threshold_low
                          ? 'bg-[#4F8A3C]'
                          : 'bg-[#4F8A3C]'
                      }`}
                      style={{ width: `${Math.min(m.food_cost, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#735A47]">
                    <span>HPP: {formatRupiah(m.hpp)}</span>
                    <span>Harga Jual: {formatRupiah(m.selling_price)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Profit Margin Breakdown */}
        <div className="glass-solid p-5 lg:p-6 rounded-[28px] space-y-4 shadow-xs border border-white/70">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60">
            <div>
              <h3 className="font-display text-sm font-bold text-[#2B2118]">Gross Profit Margin (%)</h3>
              <p className="text-xs text-[#735A47] mt-0.5">
                Keuntungan kotor per menu penjualan aktif
              </p>
            </div>
            <span className="font-mono text-xs text-[#285A1D] bg-[#EAF5E5] px-2.5 py-1 rounded-full border border-[#C5E5BC] font-semibold shadow-2xs">
              Avg: {formatPercent(marginStats.avg)}
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {activeMenus.map(m => (
              <div key={m.id} className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#2B2118]">{m.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[#735A47]">
                      {formatRupiah(m.gross_profit)} / porsi
                    </span>
                    <span className="font-mono font-bold text-[#285A1D] tabular-nums">
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
      </div>
    </div>
  );
};
