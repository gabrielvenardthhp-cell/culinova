/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { Topbar } from './components/common/Topbar';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { DashboardView } from './components/dashboard/DashboardView';
import { IngredientsView } from './components/ingredients/IngredientsView';
import { RecipesView } from './components/recipes/RecipesView';
import { SubRecipesView } from './components/subrecipes/SubRecipesView';
import { MenusView } from './components/menus/MenusView';
import { PriceHistoryView } from './components/history/PriceHistoryView';
import { UnitsView } from './components/units/UnitsView';
import { CategoriesView } from './components/categories/CategoriesView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { LoginModal } from './components/auth/LoginModal';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { api, DashboardData } from './lib/api';
import bgCulinaryImage from './assets/images/dish_nasi_goreng_1791109832554.jpg';
import {
  Ingredient,
  Recipe,
  SubRecipe,
  SalesMenu,
  Category,
  Unit,
  IngredientPriceHistory,
  AppSettings,
  AuditLog,
} from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Core Data State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardCategory, setDashboardCategory] = useState('ALL');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [subRecipes, setSubRecipes] = useState<SubRecipe[]>([]);
  const [salesMenus, setSalesMenus] = useState<SalesMenu[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [priceHistory, setPriceHistory] = useState<IngredientPriceHistory[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    app_name: 'CULINOVA',
    currency: 'IDR',
    food_cost_target: 35,
    margin_target: 65,
    food_cost_threshold_low: 28,
    food_cost_threshold_high: 38,
    price_rounding: '500',
    date_format: 'DD MMM YYYY',
    google_sheet_id: '',
    google_client_email: '',
    google_is_connected: false,
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Selected recipe detail or filter state
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedIngredientForHistory, setSelectedIngredientForHistory] = useState<string | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts(prev => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Load all data
  const loadAllData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [
        dash,
        ingList,
        recList,
        subList,
        menuList,
        catList,
        unitList,
        histList,
        setObj,
        logList,
      ] = await Promise.all([
        api.getDashboardData(),
        api.getIngredients(),
        api.getRecipes(),
        api.getSubRecipes(),
        api.getSalesMenus(),
        api.getCategories(),
        api.getUnits(),
        api.getPriceHistory(),
        api.getSettings(),
        api.getAuditLogs(),
      ]);

      setDashboardData(dash);
      setIngredients(ingList);
      setRecipes(recList);
      setSubRecipes(subList);
      setSalesMenus(menuList);
      setCategories(catList);
      setUnits(unitList);
      setPriceHistory(histList);
      setSettings(setObj);
      setAuditLogs(logList);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      addToast('error', err.message || 'Gagal memuat data dari server.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handlers for Ingredients
  const handleAddIngredient = async (data: any) => {
    const created = await api.createIngredient(data);
    addToast('success', `Bahan baku '${created.name}' berhasil ditambahkan.`);
    await loadAllData();
  };

  const handleUpdateIngredient = async (id: string, data: any) => {
    const updated = await api.updateIngredient(id, data);
    addToast('success', `Bahan '${updated.name}' berhasil diperbarui dan HPP dihitung ulang.`);
    await loadAllData();
  };

  const handleDeleteIngredient = async (id: string) => {
    await api.deleteIngredient(id);
    addToast('success', 'Bahan baku berhasil dihapus.');
    await loadAllData();
  };

  const handleViewPriceHistory = (ingredientId: string) => {
    setSelectedIngredientForHistory(ingredientId);
    setCurrentTab('price-history');
  };

  // Handlers for Recipes
  const handleAddRecipe = async (data: any) => {
    const created = await api.createRecipe(data);
    addToast('success', `Resep '${created.name}' berhasil dibuat (HPP: Rp${created.hpp_per_portion.toLocaleString()}).`);
    await loadAllData();
    setSelectedRecipeId(created.id);
  };

  const handleUpdateRecipe = async (id: string, data: any) => {
    const updated = await api.updateRecipe(id, data);
    addToast('success', `Resep '${updated.name}' berhasil diperbarui.`);
    await loadAllData();
  };

  const handleDeleteRecipe = async (id: string) => {
    await api.deleteRecipe(id);
    addToast('success', 'Resep berhasil dihapus.');
    await loadAllData();
  };

  const handleActivateVersion = async (recipeId: string, versionId: string) => {
    await api.activateRecipeVersion(recipeId, versionId);
    addToast('success', 'Versi resep aktif berhasil diperbarui.');
    await loadAllData();
  };

  // Handlers for Sub Recipes
  const handleAddSubRecipe = async (data: any) => {
    const created = await api.createSubRecipe(data);
    addToast('success', `Sub-resep '${created.name}' berhasil dibuat.`);
    await loadAllData();
  };

  const handleUpdateSubRecipe = async (id: string, data: any) => {
    const updated = await api.updateSubRecipe(id, data);
    addToast('success', `Sub-resep '${updated.name}' berhasil diperbarui.`);
    await loadAllData();
  };

  const handleDeleteSubRecipe = async (id: string) => {
    await api.deleteSubRecipe(id);
    addToast('success', 'Sub-resep berhasil dihapus.');
    await loadAllData();
  };

  // Handlers for Menus
  const handleAddMenu = async (data: any) => {
    const created = await api.createSalesMenu(data);
    addToast('success', `Menu jual '${created.name}' berhasil ditambahkan ke katalog.`);
    await loadAllData();
  };

  const handleUpdateMenu = async (id: string, data: any) => {
    const updated = await api.updateSalesMenu(id, data);
    addToast('success', `Menu jual '${updated.name}' berhasil diperbarui.`);
    await loadAllData();
  };

  const handleDeleteMenu = async (id: string) => {
    await api.deleteSalesMenu(id);
    addToast('success', 'Menu jual berhasil dihapus.');
    await loadAllData();
  };

  // Handlers for Units & Categories
  const handleAddUnit = async (data: Partial<Unit>) => {
    await api.createUnit(data);
    addToast('success', 'Satuan baru berhasil ditambahkan.');
    await loadAllData();
  };

  const handleAddCategory = async (data: Partial<Category>) => {
    await api.createCategory(data);
    addToast('success', 'Kategori baru berhasil ditambahkan.');
    await loadAllData();
  };

  const handleUpdateCategory = async (id: string, data: Partial<Category>) => {
    await api.updateCategory(id, data);
    addToast('success', 'Kategori berhasil diperbarui.');
    await loadAllData();
  };

  const handleDeleteCategory = async (id: string) => {
    await api.deleteCategory(id);
    addToast('success', 'Kategori berhasil diproses.');
    await loadAllData();
  };

  // Handlers for Settings & Database
  const handleUpdateSettings = async (data: Partial<AppSettings>) => {
    const updated = await api.updateSettings(data);
    setSettings(updated);
    addToast('success', 'Pengaturan sistem berhasil disimpan.');
    await loadAllData();
  };

  const handleResetDatabase = async () => {
    await api.resetDatabase();
    addToast('success', 'Database berhasil di-reset ke data bawaan Culinova.');
    await loadAllData();
  };

  const handleTestSheetsConnection = async () => {
    return await api.testSheetsConnection();
  };

  const handleInitializeSheets = async () => {
    await api.initializeSheets();
    addToast('success', 'Struktur 12 sheet Google Spreadsheet berhasil diinisialisasi.');
    await loadAllData();
  };

  // Auth Handlers
  const handleLogin = async (credentials: { username: string; password: string }) => {
    await api.login(credentials);
    setIsAuthenticated(true);
    setIsLoginModalOpen(false);
    addToast('success', 'Selamat datang kembali, Chef Gabriel.');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsLoginModalOpen(true);
    addToast('info', 'Anda telah keluar dari sistem.');
  };

  // Tab Title & Subtitle Mapping
  const tabTitles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard Intelligence',
      subtitle: 'Ringkasan performa biaya dan profitabilitas kuliner',
    },
    recipes: {
      title: 'Bank Resep (Recipe Bank)',
      subtitle: 'Formulasi racikan, HPP otomatis, dan versi resep',
    },
    'add-recipe': {
      title: 'Tambah Resep Baru',
      subtitle: 'Buat formula masakan dan hitung HPP porsi otomatis',
    },
    'sub-recipes': {
      title: 'Sub-Recipe Management',
      subtitle: 'Komponen racikan pendukung (sambal, saus, kaldu)',
    },
    ingredients: {
      title: 'Master Bahan Baku (Ingredients)',
      subtitle: 'Daftar harga beli, satuan konversi per base unit, dan supplier',
    },
    'price-history': {
      title: 'Riwayat Harga Bahan',
      subtitle: 'Log fluktuasi harga supplier dan alasan penyesuaian biaya',
    },
    units: {
      title: 'Master Satuan & Konversi',
      subtitle: 'Faktor konversi otomatis ke satuan terkecil (Base Unit)',
    },
    suppliers: {
      title: 'Direktori Supplier',
      subtitle: 'Daftar vendor penyedia bahan baku aktif',
    },
    'sales-menus': {
      title: 'Menu Jual (Sales Menus)',
      subtitle: 'Produk POS kasir yang dihubungkan dengan resep aktif',
    },
    categories: {
      title: 'Master Kategori',
      subtitle: 'Klasifikasi taksonomi bahan, resep, dan menu',
    },
    analytics: {
      title: 'Food Cost & Margin Analytics',
      subtitle: 'Grafik distribusi rasio biaya bahan dan margin kotor',
    },
    reports: {
      title: 'Laporan & Ekspor Data',
      subtitle: 'Cetak dan ekspor CSV untuk audit HPP dan pergerakan biaya',
    },
    settings: {
      title: 'Pengaturan & Integrasi',
      subtitle: 'Konfigurasi target biaya, pembulatan, dan koneksi Google Sheets',
    },
  };

  const currentTabInfo = tabTitles[currentTab] || {
    title: 'CULINOVA',
    subtitle: 'Recipe & Food Cost Management',
  };

  return (
    <div className="relative min-h-screen bg-[#FAF6EF] text-[#2B2118] flex flex-col antialiased">
      {/* Fixed culinary background with warm cream veil */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: `url(${bgCulinaryImage})`,
        }}
      >
        <div
          className={`absolute inset-0 transition-colors duration-500 ${
            currentTab === 'dashboard'
              ? 'bg-[#FAF6EF]/82 backdrop-blur-[2px]'
              : 'bg-[#FAF6EF]/92 backdrop-blur-[4px]'
          }`}
        />
      </div>

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab === 'add-recipe' ? 'recipes' : currentTab}
        onSelectTab={tab => {
          if (tab === 'add-recipe') {
            setCurrentTab('recipes');
            setSelectedRecipeId(null);
          } else {
            setCurrentTab(tab);
          }
          if (tab !== 'recipes') {
            setSelectedRecipeId(null);
          }
          if (tab !== 'price-history') {
            setSelectedIngredientForHistory(null);
          }
        }}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        pendingAlertCount={dashboardData?.costAlerts.length || 0}
      />

      {/* Main Content Area */}
      <div className="relative z-10 lg:pl-72 flex flex-col flex-1 min-h-screen pb-20 lg:pb-8">
        {/* Top Header */}
        <Topbar
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          title={currentTabInfo.title}
          subtitle={currentTabInfo.subtitle}
          onQuickAddRecipe={() => {
            setCurrentTab('recipes');
            setSelectedRecipeId(null);
          }}
          onRefreshData={loadAllData}
          isRefreshing={isRefreshing}
          onLogout={handleLogout}
          googleConnected={settings.google_is_connected}
        />

        {/* Dynamic Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {currentTab === 'dashboard' && (
            <DashboardView
              data={dashboardData}
              isLoading={isLoading}
              onNavigateTab={tab => {
                setCurrentTab(tab);
                if (tab === 'add-recipe') {
                  setCurrentTab('recipes');
                }
              }}
              onSelectRecipe={id => {
                setSelectedRecipeId(id);
                setCurrentTab('recipes');
              }}
              targetFoodCost={settings.food_cost_target}
              categories={categories}
              selectedCategory={dashboardCategory}
              onSelectCategory={async (cat: string) => {
                setDashboardCategory(cat);
                try {
                  const data = await api.getDashboardData(cat);
                  setDashboardData(data);
                } catch (e) {
                  console.error(e);
                }
              }}
            />
          )}

          {currentTab === 'ingredients' && (
            <IngredientsView
              ingredients={ingredients}
              categories={categories}
              units={units}
              onAddIngredient={handleAddIngredient}
              onUpdateIngredient={handleUpdateIngredient}
              onDeleteIngredient={handleDeleteIngredient}
              onViewPriceHistory={handleViewPriceHistory}
              isLoading={isLoading}
            />
          )}

          {currentTab === 'recipes' && (
            <RecipesView
              recipes={recipes}
              ingredients={ingredients}
              subRecipes={subRecipes}
              categories={categories}
              units={units}
              selectedRecipeId={selectedRecipeId}
              onSelectRecipe={setSelectedRecipeId}
              onAddRecipe={handleAddRecipe}
              onUpdateRecipe={handleUpdateRecipe}
              onDeleteRecipe={handleDeleteRecipe}
              onActivateVersion={handleActivateVersion}
              defaultTargetFoodCost={settings.food_cost_target}
              priceRounding={settings.price_rounding}
              isLoading={isLoading}
            />
          )}

          {currentTab === 'sub-recipes' && (
            <SubRecipesView
              subRecipes={subRecipes}
              ingredients={ingredients}
              recipes={recipes}
              units={units}
              onAddSubRecipe={handleAddSubRecipe}
              onUpdateSubRecipe={handleUpdateSubRecipe}
              onDeleteSubRecipe={handleDeleteSubRecipe}
              isLoading={isLoading}
            />
          )}

          {currentTab === 'sales-menus' && (
            <MenusView
              menus={salesMenus}
              recipes={recipes}
              categories={categories}
              onAddMenu={handleAddMenu}
              onUpdateMenu={handleUpdateMenu}
              onDeleteMenu={handleDeleteMenu}
              defaultTargetFoodCost={settings.food_cost_target}
              priceRounding={settings.price_rounding}
              isLoading={isLoading}
            />
          )}

          {currentTab === 'price-history' && (
            <PriceHistoryView
              priceHistory={priceHistory}
              ingredients={ingredients}
              initialIngredientId={selectedIngredientForHistory}
              onClearFilter={() => setSelectedIngredientForHistory(null)}
            />
          )}

          {currentTab === 'units' && (
            <UnitsView
              units={units}
              onAddUnit={handleAddUnit}
              isLoading={isLoading}
            />
          )}

          {currentTab === 'categories' && (
            <CategoriesView
              categories={categories}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              isLoading={isLoading}
            />
          )}

          {currentTab === 'suppliers' && (
            <SuppliersView ingredients={ingredients} />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView
              menus={salesMenus}
              recipes={recipes}
              settings={settings}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              recipes={recipes}
              ingredients={ingredients}
              menus={salesMenus}
              priceHistory={priceHistory}
              categories={categories}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              auditLogs={auditLogs}
              onUpdateSettings={handleUpdateSettings}
              onResetDatabase={handleResetDatabase}
              onTestSheetsConnection={handleTestSheetsConnection}
              onInitializeSheets={handleInitializeSheets}
              isLoading={isLoading}
            />
          )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Demo Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onLogin={handleLogin}
      />
    </div>
  );
}
