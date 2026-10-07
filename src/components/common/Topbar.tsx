import React from 'react';
import { Menu, Plus, RefreshCw, Database, LogOut } from 'lucide-react';

interface TopbarProps {
  onOpenMobileSidebar: () => void;
  title: string;
  subtitle?: string;
  onQuickAddRecipe?: () => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  onLogout?: () => void;
  googleConnected?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileSidebar,
  title,
  subtitle,
  onQuickAddRecipe,
  onRefreshData,
  isRefreshing = false,
  onLogout,
  googleConnected = false,
}) => {
  return (
    <header className="sticky top-3 z-30 mx-4 lg:mx-6 my-2 glass rounded-full px-5 py-2.5 flex items-center justify-between shadow-xs transition-all">
      {/* Zone 1: Mobile Hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden w-8 h-8 rounded-full bg-white/70 hover:bg-white text-[#2B2118] flex items-center justify-center transition-all shadow-2xs border border-white/60"
          aria-label="Buka Menu Navigasi"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-display text-sm lg:text-base font-bold text-[#2B2118] tracking-tight leading-none">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden sm:block text-[11px] text-[#735A47] mt-0.5 font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Zone 2: Actions & Profile */}
      <div className="flex items-center gap-2">
        {/* Google Sheets Status Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-[#285A1D] bg-[#EAF5E5]/90 border border-[#C5E5BC] rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4F8A3C] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4F8A3C]"></span>
          </span>
          <Database className="w-3 h-3 text-[#4F8A3C]" />
          <span>{googleConnected ? 'Google Sheets Live' : 'Spreadsheet Ready'}</span>
        </div>

        {/* Refresh Action */}
        {onRefreshData && (
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            className="w-8 h-8 rounded-full bg-white/70 hover:bg-white text-[#5A4838] hover:text-[#2B2118] border border-white/60 flex items-center justify-center transition-all shadow-2xs disabled:opacity-50"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#D9482B]' : ''}`} />
          </button>
        )}

        {/* Quick Add Recipe */}
        {onQuickAddRecipe && (
          <button
            onClick={onQuickAddRecipe}
            className="btn-pill-primary hidden sm:inline-flex"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Resep Baru</span>
          </button>
        )}

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/60">
          <div className="w-8 h-8 rounded-full bg-[#D9482B]/15 text-[#D9482B] flex items-center justify-center text-xs font-bold border border-[#D9482B]/20">
            G
          </div>
          <div className="hidden xl:block text-left text-xs leading-none">
            <div className="font-bold text-[#2B2118]">Gabriel</div>
            <div className="text-[10px] text-[#8C7A6B] mt-0.5">Executive Chef</div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-7 h-7 rounded-full text-[#8C7A6B] hover:text-[#D9482B] hover:bg-white/70 flex items-center justify-center transition-colors ml-1"
              title="Keluar / Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
