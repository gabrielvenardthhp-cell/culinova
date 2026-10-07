import React from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  PlusCircle,
  FolderTree,
  Layers,
  Wheat,
  History,
  Scale,
  Truck,
  BookOpen,
  BarChart3,
  FileSpreadsheet,
  Settings,
  X,
  ChefHat,
  Database,
} from 'lucide-react';

import { motion } from 'motion/react';

export type NavTab =
  | 'dashboard'
  | 'recipes'
  | 'add-recipe'
  | 'categories'
  | 'sub-recipes'
  | 'ingredients'
  | 'price-history'
  | 'units'
  | 'suppliers'
  | 'sales-menus'
  | 'analytics'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  pendingAlertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  pendingAlertCount = 0,
}) => {
  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const NavItem: React.FC<{
    tab: NavTab;
    icon: React.ReactNode;
    label: string;
    badge?: React.ReactNode;
  }> = ({ tab, icon, label, badge }) => {
    const isActive = currentTab === tab;
    return (
      <button
        type="button"
        onClick={() => handleNavClick(tab)}
        className={`relative group w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-full transition-colors cursor-pointer select-none ${
          isActive
            ? 'text-white font-semibold'
            : 'text-[#5A4838] hover:bg-white/60 hover:text-[#2B2118]'
        }`}
      >
        {isActive && (
          <motion.div
            layoutId="activeSidebarNav"
            className="absolute inset-0 bg-[#D9482B] rounded-full shadow-sm -z-10"
            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
          />
        )}
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              isActive
                ? 'bg-white/20 text-white'
                : 'bg-white/60 text-[#735A47] group-hover:bg-white group-hover:text-[#2B2118]'
            }`}
          >
            {icon}
          </div>
          <span className="font-medium text-xs">{label}</span>
        </div>
        {badge}
      </button>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-[#2B2118]/40 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-200"
          onClick={onCloseMobile}
        />
      )}

      {/* Floating Glass Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed z-50 transition-all duration-200 ease-out flex flex-col ${
          isOpenMobile
            ? 'top-2 bottom-2 left-2 w-72 glass rounded-[28px] translate-x-0'
            : '-translate-x-full lg:translate-x-0 lg:top-4 lg:bottom-4 lg:left-4 lg:w-64 glass rounded-[28px]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-white/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#D9482B] text-white flex items-center justify-center shadow-xs">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-base tracking-tight text-[#2B2118] leading-none">
                CULINOVA
              </div>
              <div className="text-[10px] text-[#8C7A6B] font-medium tracking-wider uppercase mt-0.5">
                Kitchen & Cost System
              </div>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-[#8C7A6B] hover:text-[#2B2118] hover:bg-white/60 rounded-full transition-colors"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {/* Main Dashboard */}
          <div>
            <NavItem
              tab="dashboard"
              icon={<LayoutDashboard className="w-3.5 h-3.5" />}
              label="Dashboard"
              badge={
                pendingAlertCount > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-white/90 text-[#D9482B] rounded-full font-bold shadow-2xs">
                    {pendingAlertCount}
                  </span>
                ) : undefined
              }
            />
          </div>

          {/* Recipe Management */}
          <div>
            <div className="px-3 mb-1 text-[10px] font-bold text-[#9E8B7A] tracking-wider uppercase">
              Resep & Dapur
            </div>
            <div className="space-y-1">
              <NavItem
                tab="recipes"
                icon={<UtensilsCrossed className="w-3.5 h-3.5" />}
                label="Bank Resep"
              />
              <NavItem
                tab="add-recipe"
                icon={<PlusCircle className="w-3.5 h-3.5" />}
                label="Tambah Resep"
              />
              <NavItem
                tab="sub-recipes"
                icon={<Layers className="w-3.5 h-3.5" />}
                label="Sub-Resep"
              />
              <NavItem
                tab="categories"
                icon={<FolderTree className="w-3.5 h-3.5" />}
                label="Kategori Resep"
              />
            </div>
          </div>

          {/* Ingredient Management */}
          <div>
            <div className="px-3 mb-1 text-[10px] font-bold text-[#9E8B7A] tracking-wider uppercase">
              Bahan & Pasokan
            </div>
            <div className="space-y-1">
              <NavItem
                tab="ingredients"
                icon={<Wheat className="w-3.5 h-3.5" />}
                label="Bahan Baku"
              />
              <NavItem
                tab="price-history"
                icon={<History className="w-3.5 h-3.5" />}
                label="Riwayat Harga"
              />
              <NavItem
                tab="units"
                icon={<Scale className="w-3.5 h-3.5" />}
                label="Satuan & Konversi"
              />
              <NavItem
                tab="suppliers"
                icon={<Truck className="w-3.5 h-3.5" />}
                label="Mitra Supplier"
              />
            </div>
          </div>

          {/* Menu Management */}
          <div>
            <div className="px-3 mb-1 text-[10px] font-bold text-[#9E8B7A] tracking-wider uppercase">
              Penjualan
            </div>
            <div className="space-y-1">
              <NavItem
                tab="sales-menus"
                icon={<BookOpen className="w-3.5 h-3.5" />}
                label="Menu Jual (POS)"
              />
            </div>
          </div>

          {/* Analytics & Reports */}
          <div>
            <div className="px-3 mb-1 text-[10px] font-bold text-[#9E8B7A] tracking-wider uppercase">
              Laporan & Margin
            </div>
            <div className="space-y-1">
              <NavItem
                tab="analytics"
                icon={<BarChart3 className="w-3.5 h-3.5" />}
                label="Food Cost & Margin"
              />
              <NavItem
                tab="reports"
                icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                label="Laporan Ekspor"
              />
            </div>
          </div>

          {/* System */}
          <div>
            <div className="px-3 mb-1 text-[10px] font-bold text-[#9E8B7A] tracking-wider uppercase">
              Sistem
            </div>
            <div className="space-y-1">
              <NavItem
                tab="settings"
                icon={<Settings className="w-3.5 h-3.5" />}
                label="Pengaturan Sistem"
              />
            </div>
          </div>
        </div>

        {/* Database Status Glass Footer Badge */}
        <div className="p-3 border-t border-white/50">
          <div className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-full bg-white/60">
            <span className="text-[#735A47] font-medium flex items-center gap-1.5">
              <Database className="w-3 h-3 text-[#4F8A3C]" />
              Database
            </span>
            <span className="text-[#285A1D] font-bold text-[10px] px-2 py-0.5 rounded-full bg-[#EAF5E5] border border-[#C5E5BC]">
              Sheets Live
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Glass Pill) */}
      <nav className="lg:hidden fixed bottom-3 left-4 right-4 z-40 glass rounded-full px-3 py-2 flex items-center justify-around shadow-lg">
        {([
          { tab: 'dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Overview' },
          { tab: 'recipes', icon: <UtensilsCrossed className="w-4 h-4" />, label: 'Resep' },
          { tab: 'ingredients', icon: <Wheat className="w-4 h-4" />, label: 'Bahan' },
          { tab: 'sales-menus', icon: <BookOpen className="w-4 h-4" />, label: 'Menu' },
          { tab: 'reports', icon: <FileSpreadsheet className="w-4 h-4" />, label: 'Laporan' },
        ] as const).map(item => {
          const isActive = currentTab === item.tab;
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => onSelectTab(item.tab)}
              className={`relative flex flex-col items-center gap-0.5 p-1 rounded-full cursor-pointer transition-colors ${
                isActive ? 'text-[#D9482B]' : 'text-[#735A47]'
              }`}
            >
              <div
                className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isActive ? 'text-white' : 'bg-white/60 text-[#735A47]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileBottomNavActive"
                    className="absolute inset-0 bg-[#D9482B] rounded-full shadow-2xs -z-10"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                {item.icon}
              </div>
              <span className={`text-[9.5px] ${isActive ? 'font-bold text-[#D9482B]' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
