import React, { useMemo } from 'react';
import { Truck, Wheat, Phone, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { Ingredient } from '../../types';

interface SuppliersViewProps {
  ingredients: Ingredient[];
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({ ingredients }) => {
  const supplierStats = useMemo(() => {
    const map = new Map<string, { count: number; items: string[] }>();
    ingredients.forEach(i => {
      const sup = i.supplier || 'Supplier Umum';
      if (!map.has(sup)) {
        map.set(sup, { count: 0, items: [] });
      }
      const entry = map.get(sup)!;
      entry.count += 1;
      entry.items.push(i.name);
    });

    return Array.from(map.entries()).map(([supplier, data]) => ({
      supplier,
      count: data.count,
      items: data.items,
    }));
  }, [ingredients]);

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-stone-200/60">
        <h2 className="font-display text-xl lg:text-[22px] font-bold tracking-tight text-[#2B2118]">
          Direktori Supplier & Mitra Pasokan (Suppliers)
        </h2>
        <p className="text-xs text-[#735A47] mt-0.5">
          Daftar vendor pemasok bahan baku kuliner dan komoditas aktif.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {supplierStats.map((stat, idx) => (
          <motion.div
            key={stat.supplier}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(idx * 0.04, 0.2) }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            className="glass rounded-[20px] p-5 space-y-3.5 transition-shadow hover:shadow-md border border-white/80"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#D9482B]/10 border border-[#D9482B]/20 text-[#D9482B] flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[#2B2118]">{stat.supplier}</h3>
                  <div className="text-[11px] text-[#735A47]">Mitra Resmi Culinova</div>
                </div>
              </div>
              <span className="badge-safe font-mono font-semibold">
                {stat.count} Bahan
              </span>
            </div>

            <div className="pt-3 border-t border-stone-200/60 text-xs">
              <div className="text-[10.5px] font-semibold text-[#735A47] uppercase tracking-wider mb-2">
                Bahan yang dipasok:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stat.items.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-white/80 backdrop-blur-xs border border-white/90 rounded-full text-[11px] font-medium text-[#735A47] shadow-2xs"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
