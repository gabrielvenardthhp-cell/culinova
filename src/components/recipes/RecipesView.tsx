import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Clock,
  Printer,
  Edit2,
  Trash2,
  Layers,
  ArrowRight,
  TrendingUp,
  Percent,
  AlertCircle,
  History,
  GitBranch,
  CheckCircle,
  Eye,
  X,
  FileDown,
  UtensilsCrossed,
  ChevronDown,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Recipe, Ingredient, SubRecipe, Category, Unit, RecipeVersion } from '../../types';
import { formatRupiah, formatPercent, formatDate, calculateEstimatedSellingPrice } from '../../lib/formatters';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ImageUploader } from '../common/ImageUploader';

interface RecipesViewProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  subRecipes: SubRecipe[];
  categories: Category[];
  units: Unit[];
  selectedRecipeId?: string | null;
  onSelectRecipe: (id: string | null) => void;
  onAddRecipe: (data: any) => Promise<void>;
  onUpdateRecipe: (id: string, data: any) => Promise<void>;
  onDeleteRecipe: (id: string) => Promise<void>;
  onActivateVersion: (recipeId: string, versionId: string) => Promise<void>;
  defaultTargetFoodCost?: number;
  priceRounding?: 'NONE' | '500' | '1000';
  isLoading: boolean;
}

export const RecipesView: React.FC<RecipesViewProps> = ({
  recipes,
  ingredients,
  subRecipes,
  categories,
  units,
  selectedRecipeId,
  onSelectRecipe,
  onAddRecipe,
  onUpdateRecipe,
  onDeleteRecipe,
  onActivateVersion,
  defaultTargetFoodCost = 35,
  priceRounding = '500',
  isLoading,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'hpp' | 'food_cost' | 'margin'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Version Comparison Modal
  const [isComparingVersions, setIsComparingVersions] = useState(false);
  const [compareV1, setCompareV1] = useState<string>('');
  const [compareV2, setCompareV2] = useState<string>('');

  // Print Mode State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form State for Add / Edit Recipe
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category_id: 'cat_rec_makanan',
    photo_url: '/src/assets/images/dish_ayam_geprek_1791109817096.jpg',
    description: '',
    yield_quantity: 10,
    yield_unit: 'Portion',
    prep_time: 20,
    cook_time: 20,
    instructions: '',
    notes: '',
    status: 'ACTIVE' as 'ACTIVE' | 'DRAFT' | 'INACTIVE',
    target_food_cost_pct: defaultTargetFoodCost,
    selling_price: 25000,
    create_new_version: false,
    version_name: '',
    version_notes: '',
    recipe_items: [] as {
      id?: string;
      ingredient_type: 'INGREDIENT' | 'SUB_RECIPE';
      ingredient_id: string;
      quantity: number;
      unit: string;
    }[],
  });

  // Current viewed recipe (detail drawer/modal)
  const currentRecipe = useMemo(() => {
    return recipes.find(r => r.id === selectedRecipeId) || null;
  }, [recipes, selectedRecipeId]);

  // Filtered & Sorted recipes
  const filteredRecipes = useMemo(() => {
    return recipes
      .filter(r => {
        const matchesSearch =
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = selectedCategory === 'ALL' || r.category_id === selectedCategory;
        const matchesStatus = selectedStatus === 'ALL' || r.status === selectedStatus;
        return matchesSearch && matchesCat && matchesStatus;
      })
      .sort((a, b) => {
        let valA = a.name;
        let valB = b.name;
        if (sortBy === 'hpp') {
          return sortOrder === 'asc' ? a.hpp_per_portion - b.hpp_per_portion : b.hpp_per_portion - a.hpp_per_portion;
        }
        if (sortBy === 'food_cost') {
          return sortOrder === 'asc' ? a.food_cost_pct - b.food_cost_pct : b.food_cost_pct - a.food_cost_pct;
        }
        if (sortBy === 'margin') {
          return sortOrder === 'asc' ? a.margin_pct - b.margin_pct : b.margin_pct - a.margin_pct;
        }
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
  }, [recipes, searchTerm, selectedCategory, selectedStatus, sortBy, sortOrder]);

  const handleOpenAdd = () => {
    setFormError(null);
    setEditingRecipe(null);
    setFormData({
      code: `REC-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: '',
      category_id: categories.find(c => c.type === 'RECIPE')?.id || 'cat_rec_makanan',
      photo_url: '/src/assets/images/dish_ayam_geprek_1791109817096.jpg',
      description: '',
      yield_quantity: 10,
      yield_unit: 'Portion',
      prep_time: 20,
      cook_time: 20,
      instructions: '',
      notes: '',
      status: 'ACTIVE',
      target_food_cost_pct: defaultTargetFoodCost,
      selling_price: 25000,
      create_new_version: false,
      version_name: '',
      version_notes: '',
      recipe_items: [
        {
          ingredient_type: 'INGREDIENT',
          ingredient_id: ingredients[0]?.id || '',
          quantity: 1000,
          unit: 'Gram',
        },
      ],
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (recipe: Recipe) => {
    setFormError(null);
    setEditingRecipe(recipe);
    setFormData({
      code: recipe.code,
      name: recipe.name,
      category_id: recipe.category_id,
      photo_url: recipe.photo_url,
      description: recipe.description || '',
      yield_quantity: recipe.yield_quantity,
      yield_unit: recipe.yield_unit,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      instructions: recipe.instructions || '',
      notes: recipe.notes || '',
      status: recipe.status,
      target_food_cost_pct: recipe.target_food_cost_pct || defaultTargetFoodCost,
      selling_price: recipe.selling_price || 0,
      create_new_version: false,
      version_name: '',
      version_notes: '',
      recipe_items: (recipe.ingredients || []).map(ri => ({
        id: ri.id,
        ingredient_type: ri.ingredient_type,
        ingredient_id: ri.ingredient_id,
        quantity: ri.quantity,
        unit: ri.unit,
      })),
    });
    setIsFormOpen(true);
  };

  const handleAddIngredientRow = () => {
    setFormData(prev => ({
      ...prev,
      recipe_items: [
        ...prev.recipe_items,
        {
          ingredient_type: 'INGREDIENT',
          ingredient_id: ingredients[0]?.id || '',
          quantity: 100,
          unit: 'Gram',
        },
      ],
    }));
  };

  const handleRemoveIngredientRow = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recipe_items: prev.recipe_items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const updated = [...prev.recipe_items];
      updated[index] = { ...updated[index], [field]: value };

      // Set default unit if ingredient type changed
      if (field === 'ingredient_type' && value === 'SUB_RECIPE') {
        updated[index].ingredient_id = subRecipes[0]?.id || '';
        updated[index].unit = 'Portion';
      } else if (field === 'ingredient_type' && value === 'INGREDIENT') {
        updated[index].ingredient_id = ingredients[0]?.id || '';
        updated[index].unit = 'Gram';
      }
      return { ...prev, recipe_items: updated };
    });
  };

  // Live calculation inside form
  const formCalculations = useMemo(() => {
    let totalCost = 0;
    formData.recipe_items.forEach(item => {
      if (item.ingredient_type === 'INGREDIENT') {
        const ing = ingredients.find(i => i.id === item.ingredient_id);
        if (ing) {
          const u = units.find(unit => unit.name.toLowerCase() === item.unit.toLowerCase());
          const factor = u ? u.conversion_factor : 1;
          const cost = item.quantity * factor * ing.price_per_base_unit;
          totalCost += cost;
        }
      } else if (item.ingredient_type === 'SUB_RECIPE') {
        const sub = subRecipes.find(s => s.id === item.ingredient_id);
        if (sub) {
          totalCost += item.quantity * sub.cost_per_unit;
        }
      }
    });

    const hppPerPortion = formData.yield_quantity > 0 ? totalCost / formData.yield_quantity : 0;
    const estSellingPrice = calculateEstimatedSellingPrice(hppPerPortion, formData.target_food_cost_pct, priceRounding);
    const sp = formData.selling_price || estSellingPrice;
    const foodCostPct = sp > 0 ? (hppPerPortion / sp) * 100 : 0;
    const grossProfit = sp - hppPerPortion;
    const marginPct = sp > 0 ? (grossProfit / sp) * 100 : 0;

    return {
      totalCost: Math.round(totalCost),
      hppPerPortion: Math.round(hppPerPortion),
      estSellingPrice: Math.round(estSellingPrice),
      foodCostPct: Number(foodCostPct.toFixed(1)),
      grossProfit: Math.round(grossProfit),
      marginPct: Number(marginPct.toFixed(1)),
    };
  }, [formData, ingredients, subRecipes, units, priceRounding]);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Nama resep wajib diisi.');
      return;
    }
    if (formData.yield_quantity <= 0) {
      setFormError('Yield porsi harus lebih besar dari 0.');
      return;
    }
    if (formData.recipe_items.length === 0) {
      setFormError('Tambahkan minimal 1 bahan baku pada resep.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        yield_quantity: Number(formData.yield_quantity),
        prep_time: Number(formData.prep_time),
        cook_time: Number(formData.cook_time),
        selling_price: Number(formData.selling_price),
        target_food_cost_pct: Number(formData.target_food_cost_pct),
        ingredients: formData.recipe_items,
      };

      if (editingRecipe) {
        await onUpdateRecipe(editingRecipe.id, payload);
      } else {
        await onAddRecipe(payload);
      }
      setIsFormOpen(false);
      setEditingRecipe(null);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan resep.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      setIsSubmitting(true);
      await onDeleteRecipe(deletingId);
      if (selectedRecipeId === deletingId) {
        onSelectRecipe(null);
      }
      setDeletingId(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus resep.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCompare = () => {
    if (!currentRecipe || !currentRecipe.versions || currentRecipe.versions.length < 2) {
      alert('Resep ini belum memiliki minimal 2 versi untuk dibandingkan.');
      return;
    }
    setCompareV1(currentRecipe.versions[0].id);
    setCompareV2(currentRecipe.versions[currentRecipe.versions.length - 1].id);
    setIsComparingVersions(true);
  };

  return (
    <div className="glass-solid rounded-[28px] p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200/60">
        <div>
          <h2 className="font-display text-xl lg:text-2xl font-bold tracking-tight text-[#2B2118]">
            Bank Resep (Recipe Bank)
          </h2>
          <p className="text-xs text-[#735A47] mt-0.5">
            Kelola formula racikan, kalkulasi HPP otomatis, sub-resep, dan histori revisi.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Card / Table Toggle with sliding pill */}
          <div className="relative flex items-center p-1 bg-white/70 backdrop-blur-md rounded-full border border-white/90 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`relative z-10 p-1.5 px-3 rounded-full text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'text-white font-semibold'
                  : 'text-[#735A47] hover:text-[#2B2118]'
              }`}
              title="Card Grid View"
            >
              {viewMode === 'grid' && (
                <motion.div
                  layoutId="recipeViewToggle"
                  className="absolute inset-0 bg-[#D9482B] rounded-full shadow-2xs -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`relative z-10 p-1.5 px-3 rounded-full text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'text-white font-semibold'
                  : 'text-[#735A47] hover:text-[#2B2118]'
              }`}
              title="Table View"
            >
              {viewMode === 'table' && (
                <motion.div
                  layoutId="recipeViewToggle"
                  className="absolute inset-0 bg-[#D9482B] rounded-full shadow-2xs -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="btn-pill-primary shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Resep Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar: Bug 2 Fix (Responsive Grid, 44px Controls, Custom Chevrons) */}
      <div className="glass-solid p-3.5 sm:p-4 rounded-[20px] shadow-2xs border border-white/80 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-[1fr_minmax(150px,200px)_minmax(150px,200px)_minmax(150px,200px)] gap-3 items-center">
        <div className="relative w-full h-11 col-span-1 md:col-span-3 lg:col-span-1">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama atau kode resep..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-11 rounded-full pl-10 pr-4 bg-white/90 border border-stone-200/80 text-xs text-[#2B2118] placeholder:text-[#8C7A6B] focus:outline-none focus:border-[#D9482B] focus:ring-2 focus:ring-[#D9482B]/15 transition-all"
          />
        </div>

        <div className="relative w-full h-11">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full h-11 rounded-full appearance-none pl-4 pr-9 bg-white/90 border border-stone-200/80 text-xs font-semibold text-[#2B2118] cursor-pointer focus:outline-none focus:border-[#D9482B] focus:ring-2 focus:ring-[#D9482B]/15 transition-all truncate"
          >
            <option value="ALL">Semua Kategori</option>
            {categories
              .filter(c => c.type === 'RECIPE')
              .map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <ChevronDown className="w-4 h-4 text-[#8C7A6B] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="relative w-full h-11">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full h-11 rounded-full appearance-none pl-4 pr-9 bg-white/90 border border-stone-200/80 text-xs font-semibold text-[#2B2118] cursor-pointer focus:outline-none focus:border-[#D9482B] focus:ring-2 focus:ring-[#D9482B]/15 transition-all truncate"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="DRAFT">Draft</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
          <ChevronDown className="w-4 h-4 text-[#8C7A6B] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="relative w-full h-11">
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={e => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}
            className="w-full h-11 rounded-full appearance-none pl-4 pr-9 bg-white/90 border border-stone-200/80 text-xs font-semibold text-[#2B2118] cursor-pointer focus:outline-none focus:border-[#D9482B] focus:ring-2 focus:ring-[#D9482B]/15 transition-all truncate"
          >
            <option value="name-asc">Nama Resep (A - Z)</option>
            <option value="hpp-asc">HPP Terendah</option>
            <option value="hpp-desc">HPP Tertinggi</option>
            <option value="food_cost-asc">Food Cost Terendah</option>
            <option value="food_cost-desc">Food Cost Tertinggi</option>
            <option value="margin-desc">Margin Tertinggi</option>
          </select>
          <ChevronDown className="w-4 h-4 text-[#8C7A6B] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Main Content: Card Grid View or Table View */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-white/50 backdrop-blur-md rounded-2xl border border-white/70"></div>
          ))}
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="glass-solid py-16 text-center rounded-[28px] border border-white/70">
          <UtensilsCrossed className="w-10 h-10 text-[#8C7A6B] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#2B2118]">Belum Ada Resep</h3>
          <p className="text-xs text-[#735A47] mt-1 max-w-sm mx-auto">
            Mulailah meracik formula kuliner dan hitung HPP serta Food Cost otomatis.
          </p>
          <button
            onClick={handleOpenAdd}
            className="btn-pill-primary mt-4"
          >
            Buat Resep Pertama
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecipes.map((recipe, idx) => {
            const cat = categories.find(c => c.id === recipe.category_id);
            return (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.04, 0.24) }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="glass rounded-[20px] overflow-hidden flex flex-col justify-between transition-shadow hover:shadow-md border border-white/80 group"
              >
                <div>
                  {/* Photo & Badge */}
                  <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
                    <img
                      src={recipe.photo_url}
                      alt={recipe.name}
                      className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                      onError={e => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-white/90 backdrop-blur-md text-[#2B2118] rounded-full shadow-2xs border border-white/90">
                        {cat?.name || 'Makanan'}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-mono text-[#735A47] bg-white/85 backdrop-blur-md rounded-full border border-white/80">
                        {recipe.code}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full shadow-2xs ${
                          recipe.status === 'ACTIVE'
                            ? 'badge-safe'
                            : 'bg-white/85 backdrop-blur-md text-[#735A47] border border-white/80'
                        }`}
                      >
                        {recipe.status === 'ACTIVE' ? 'Aktif' : recipe.status}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-display text-sm font-bold text-[#2B2118] line-clamp-1">
                        {recipe.name}
                      </h3>
                      <p className="text-xs text-[#735A47] line-clamp-2 mt-1 leading-relaxed">
                        {recipe.description || 'Tidak ada deskripsi resep.'}
                      </p>
                    </div>

                    {/* Quick Metadata */}
                    <div className="flex items-center gap-3 text-xs text-[#735A47]">
                      <span>Yield: <strong className="text-[#2B2118]">{recipe.yield_quantity} {recipe.yield_unit}</strong></span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#8C7A6B]" />
                        {recipe.prep_time + recipe.cook_time} mnt
                      </span>
                    </div>

                    {/* Financial Metrics Strip */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-white/70 backdrop-blur-md rounded-[16px] border border-stone-200/60 text-xs">
                      <div>
                        <div className="text-[10px] text-[#735A47] uppercase font-semibold">HPP / Porsi</div>
                        <div className="font-mono font-bold text-[#2B2118] tabular-nums mt-0.5">
                          {formatRupiah(recipe.hpp_per_portion)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#735A47] uppercase font-semibold">Harga Jual</div>
                        <div className="font-mono font-bold text-[#D9482B] tabular-nums mt-0.5">
                          {formatRupiah(recipe.selling_price)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#735A47] uppercase font-semibold">Food Cost</div>
                        <div className="font-mono font-semibold tabular-nums mt-0.5">
                          <span className={recipe.food_cost_pct <= defaultTargetFoodCost ? 'text-[#285A1D]' : 'text-[#D9482B]'}>
                            {formatPercent(recipe.food_cost_pct)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#735A47] uppercase font-semibold">Margin</div>
                        <div className="font-mono font-semibold text-[#285A1D] tabular-nums mt-0.5">
                          {formatPercent(recipe.margin_pct)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 pt-0 border-t border-stone-100/70 mt-3 flex items-center justify-between">
                  <button
                    onClick={() => onSelectRecipe(recipe.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#D9482B] hover:text-[#C23C21] transition-colors"
                  >
                    <span>Detail & Formulasi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(recipe)}
                      className="p-1.5 text-[#735A47] hover:text-[#2B2118] hover:bg-white/80 rounded-full transition-colors"
                      title="Edit Resep"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(recipe.id)}
                      className="p-1.5 text-[#D9482B] hover:bg-[#FDEDE8] rounded-full transition-colors"
                      title="Hapus Resep"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-[20px] overflow-hidden border border-stone-200/60 bg-white/70">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200/70 bg-white/80 text-[#735A47] font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Nama Resep</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Yield</th>
                  <th className="py-3 px-4 text-right">HPP Batch</th>
                  <th className="py-3 px-4 text-right">HPP / Porsi</th>
                  <th className="py-3 px-4 text-right">Harga Jual</th>
                  <th className="py-3 px-4 text-right">Food Cost</th>
                  <th className="py-3 px-4 text-right">Margin</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100/80">
                {filteredRecipes.map(recipe => {
                  const cat = categories.find(c => c.id === recipe.category_id);
                  return (
                    <tr key={recipe.id} className="hover:bg-white/95 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-[#735A47]">
                        {recipe.code}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onSelectRecipe(recipe.id)}
                          className="font-bold text-[#2B2118] hover:text-[#D9482B] text-left transition-colors"
                        >
                          {recipe.name}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-[#735A47]">{cat?.name || 'Makanan'}</td>
                      <td className="py-3 px-4 text-[#5A4838]">
                        {recipe.yield_quantity} {recipe.yield_unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#2B2118]">
                        {formatRupiah(recipe.total_ingredient_cost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#2B2118]">
                        {formatRupiah(recipe.hpp_per_portion)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#D9482B]">
                        {formatRupiah(recipe.selling_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                        <span className={recipe.food_cost_pct <= defaultTargetFoodCost ? 'text-[#285A1D]' : 'text-[#D9482B]'}>
                          {formatPercent(recipe.food_cost_pct)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#285A1D]">
                        {formatPercent(recipe.margin_pct)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            recipe.status === 'ACTIVE'
                              ? 'badge-safe'
                              : 'bg-stone-100 text-[#735A47]'
                          }`}
                        >
                          {recipe.status === 'ACTIVE' ? 'Aktif' : recipe.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onSelectRecipe(recipe.id)}
                            className="p-1.5 text-[#274035] hover:bg-[#274035]/10 rounded-lg transition-colors"
                            title="Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(recipe)}
                            className="p-1.5 text-[#66776F] hover:text-[#141F1A] hover:bg-white/80 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(recipe.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50/80 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECIPE DETAIL MODAL / DRAWER */}
      {currentRecipe && (
        <Modal
          isOpen={currentRecipe !== null}
          onClose={() => onSelectRecipe(null)}
          title={`Detail Resep: ${currentRecipe.name}`}
          subtitle={`${currentRecipe.code} · Kategori: ${categories.find(c => c.id === currentRecipe.category_id)?.name || 'Makanan'}`}
          maxWidth="3xl"
        >
          <div className="space-y-6 text-xs">
            {/* Hero Section */}
            <div className="relative rounded-2xl overflow-hidden bg-stone-900 text-white h-48 sm:h-56 shadow-sm">
              <img
                src={currentRecipe.photo_url}
                alt={currentRecipe.name}
                className="w-full h-full object-cover opacity-60"
                onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 flex flex-col justify-end">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-emerald-600/90 text-white rounded-lg text-[10px] font-semibold backdrop-blur-xs">
                    {currentRecipe.status}
                  </span>
                  <span className="text-white/90 font-mono text-[11px]">
                    Yield: {currentRecipe.yield_quantity} {currentRecipe.yield_unit}
                  </span>
                  <span className="text-white/60">·</span>
                  <span className="text-white/90 text-[11px]">
                    Total Waktu: {currentRecipe.prep_time + currentRecipe.cook_time} Menit
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {currentRecipe.name}
                </h3>
                <p className="text-xs text-white/80 line-clamp-1 mt-0.5">
                  {currentRecipe.description || 'Resep terverifikasi standar Culinova.'}
                </p>
              </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3 bg-white/70 backdrop-blur-md border border-white/90 rounded-xl shadow-2xs">
                <div className="text-[10px] text-[#718279] uppercase font-semibold">HPP / Porsi</div>
                <div className="text-base font-bold font-mono text-[#141F1A] tabular-nums mt-0.5">
                  {formatRupiah(currentRecipe.hpp_per_portion)}
                </div>
                <div className="text-[10px] text-[#718279]">Batch: {formatRupiah(currentRecipe.total_ingredient_cost)}</div>
              </div>
              <div className="p-3 bg-white/70 backdrop-blur-md border border-white/90 rounded-xl shadow-2xs">
                <div className="text-[10px] text-[#718279] uppercase font-semibold">Harga Jual</div>
                <div className="text-base font-bold font-mono text-[#274035] tabular-nums mt-0.5">
                  {formatRupiah(currentRecipe.selling_price)}
                </div>
                <div className="text-[10px] text-[#718279]">Target FC: {currentRecipe.target_food_cost_pct}%</div>
              </div>
              <div className="p-3 bg-white/70 backdrop-blur-md border border-white/90 rounded-xl shadow-2xs">
                <div className="text-[10px] text-[#718279] uppercase font-semibold">Food Cost</div>
                <div className="text-base font-bold font-mono text-amber-800 tabular-nums mt-0.5">
                  {formatPercent(currentRecipe.food_cost_pct)}
                </div>
                <div className="text-[10px] text-[#718279]">
                  {currentRecipe.food_cost_pct <= defaultTargetFoodCost ? 'Sesuai Target' : 'Perlu Efisiensi'}
                </div>
              </div>
              <div className="p-3 bg-white/70 backdrop-blur-md border border-white/90 rounded-xl shadow-2xs">
                <div className="text-[10px] text-[#718279] uppercase font-semibold">Gross Profit</div>
                <div className="text-base font-bold font-mono text-emerald-900 tabular-nums mt-0.5">
                  {formatRupiah(currentRecipe.gross_profit)}
                </div>
                <div className="text-[10px] text-[#718279]">Keuntungan per porsi</div>
              </div>
              <div className="col-span-2 sm:col-span-1 p-3 bg-white/70 backdrop-blur-md border border-white/90 rounded-xl shadow-2xs">
                <div className="text-[10px] text-[#718279] uppercase font-semibold">Margin %</div>
                <div className="text-base font-bold font-mono text-emerald-800 tabular-nums mt-0.5">
                  {formatPercent(currentRecipe.margin_pct)}
                </div>
                <div className="text-[10px] text-[#718279]">Profitability</div>
              </div>
            </div>

            {/* Food Cost Progress Bar */}
            <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[#0F172A]">Analisis Food Cost vs Benchmark</span>
                <span className="font-mono text-amber-800">{formatPercent(currentRecipe.food_cost_pct)}</span>
              </div>
              <div className="w-full h-3 bg-[#F1F5F9] rounded-full overflow-hidden relative">
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-500 z-10"
                  style={{ left: `${Math.min(defaultTargetFoodCost, 100)}%` }}
                  title={`Target: ${defaultTargetFoodCost}%`}
                />
                <div
                  className={`h-full rounded-full transition-all ${
                    currentRecipe.food_cost_pct > defaultTargetFoodCost ? 'bg-amber-500' : 'bg-[#2D4A3E]'
                  }`}
                  style={{ width: `${Math.min(currentRecipe.food_cost_pct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#64748B]">
                <span>0%</span>
                <span>Batas Target: {defaultTargetFoodCost}%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Ingredients Breakdown Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-[#141F1A]">Daftar Bahan & Komponen Biaya (Ingredients)</h4>
                <span className="text-[#66776F] font-mono text-[11px]">
                  {currentRecipe.ingredients?.length || 0} Komponen
                </span>
              </div>
              <div className="glass-panel rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/50 backdrop-blur-md border-b border-stone-200/60 text-[#718279] font-semibold text-[10.5px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Bahan / Sub-Resep</th>
                      <th className="py-2.5 px-3 text-right">Quantity</th>
                      <th className="py-2.5 px-3">Satuan</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Subtotal Cost</th>
                      <th className="py-2.5 px-3 text-right">% Batch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100/80">
                    {currentRecipe.ingredients?.map(item => (
                      <tr key={item.id} className="hover:bg-white/60 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-[#141F1A] flex items-center gap-2">
                          {item.ingredient_type === 'SUB_RECIPE' && (
                            <span className="px-1.5 py-0.5 text-[9px] font-mono bg-purple-100 text-purple-800 rounded font-semibold">
                              SUB
                            </span>
                          )}
                          <span>{item.ingredient_name || item.ingredient_id}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#141F1A]">
                          {item.quantity.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-[#66776F]">{item.unit}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#66776F]">
                          {formatRupiah(item.unit_price)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-[#141F1A]">
                          {formatRupiah(item.cost)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#718279]">
                          {item.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-white/60 backdrop-blur-md border-t border-stone-200/60 font-semibold">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right text-[#506259]">
                        Total Biaya Bahan (HPP Batch):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#141F1A]">
                        {formatRupiah(currentRecipe.total_ingredient_cost)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#506259]">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Instructions & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/70 backdrop-blur-md border border-white/90 rounded-2xl shadow-2xs">
                <h4 className="font-bold text-[#141F1A] mb-1.5">Instruksi Memasak / Standar Prosedur</h4>
                <p className="whitespace-pre-line text-[#506259] leading-relaxed">
                  {currentRecipe.instructions || 'Belum ada petunjuk instruksi.'}
                </p>
              </div>
              <div className="p-4 bg-white/70 backdrop-blur-md border border-white/90 rounded-2xl shadow-2xs">
                <h4 className="font-bold text-[#141F1A] mb-1.5">Catatan Chef & Penyimpanan</h4>
                <p className="whitespace-pre-line text-[#506259] leading-relaxed">
                  {currentRecipe.notes || 'Tidak ada catatan khusus.'}
                </p>
              </div>
            </div>

            {/* Version History Section */}
            <div className="glass-panel rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-[#274035]" />
                  <h4 className="font-bold text-[#141F1A]">Riwayat Versi Formula (Versioning)</h4>
                </div>
                {currentRecipe.versions && currentRecipe.versions.length > 1 && (
                  <button
                    onClick={handleOpenCompare}
                    className="px-2.5 py-1 text-xs font-semibold text-[#274035] bg-[#274035]/10 hover:bg-[#274035]/20 rounded-lg transition-colors"
                  >
                    Bandingkan Versi
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {currentRecipe.versions?.map(ver => (
                  <div
                    key={ver.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      ver.status === 'ACTIVE'
                        ? 'bg-emerald-50/70 border-emerald-300/50 shadow-2xs'
                        : 'bg-white/60 border-stone-200/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#141F1A]">{ver.version_name}</span>
                        {ver.status === 'ACTIVE' ? (
                          <span className="px-2 py-0.5 text-[10px] bg-emerald-700 text-white font-semibold rounded-md shadow-2xs">
                            Aktif
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] bg-stone-100 text-[#718279] rounded-md">
                            Arsip
                          </span>
                        )}
                        <span className="text-[#718279] text-[11px]">{formatDate(ver.created_at)}</span>
                      </div>
                      <div className="text-[11px] text-[#718279] mt-0.5">{ver.change_notes}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] text-[#718279] font-medium">HPP / Porsi</div>
                        <div className="font-mono font-bold text-[#141F1A]">
                          {formatRupiah(ver.hpp_per_portion)}
                        </div>
                      </div>
                      {ver.status !== 'ACTIVE' && (
                        <button
                          onClick={() => onActivateVersion(currentRecipe.id, ver.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#274035] bg-white hover:bg-[#274035] hover:text-white border border-[#274035] rounded-lg transition-colors"
                        >
                          Aktifkan
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-4 border-t border-stone-200/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="btn-pill-secondary inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-[#735A47]" />
                <span>Cetak Recipe Card (PDF)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(currentRecipe)}
                  className="btn-pill-primary"
                >
                  Edit Formula Resep
                </button>
                <button
                  type="button"
                  onClick={() => onSelectRecipe(null)}
                  className="btn-pill-secondary"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* VERSION COMPARISON MODAL (Section 24) */}
      {isComparingVersions && currentRecipe && (
        <Modal
          isOpen={isComparingVersions}
          onClose={() => setIsComparingVersions(false)}
          title={`Perbandingan Versi: ${currentRecipe.name}`}
          subtitle="Analisis perbedaan komposisi bahan, gramasi, dan perubahan HPP antar versi formulasi."
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Versi Acuan (V1)</label>
                <select
                  value={compareV1}
                  onChange={e => setCompareV1(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                >
                  {currentRecipe.versions?.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.version_name} (HPP: {formatRupiah(v.hpp_per_portion)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Versi Pembanding (V2)</label>
                <select
                  value={compareV2}
                  onChange={e => setCompareV2(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                >
                  {currentRecipe.versions?.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.version_name} (HPP: {formatRupiah(v.hpp_per_portion)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Version Diff Table */}
            {(() => {
              const ver1Obj = currentRecipe.versions?.find(v => v.id === compareV1);
              const ver2Obj = currentRecipe.versions?.find(v => v.id === compareV2);
              if (!ver1Obj || !ver2Obj) return null;

              const hppDiff = ver2Obj.hpp_per_portion - ver1Obj.hpp_per_portion;
              const hppDiffPct = ver1Obj.hpp_per_portion > 0 ? (hppDiff / ver1Obj.hpp_per_portion) * 100 : 0;

              return (
                <div className="space-y-3">
                  <div className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-[#64748B]">Perubahan HPP per Porsi:</div>
                      <div className="font-mono text-base font-bold text-[#0F172A]">
                        {formatRupiah(ver1Obj.hpp_per_portion)} &rarr; {formatRupiah(ver2Obj.hpp_per_portion)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs ${
                          hppDiff <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {hppDiff > 0 ? '+' : ''}{formatRupiah(hppDiff)} ({hppDiffPct > 0 ? '+' : ''}{hppDiffPct.toFixed(1)}%)
                      </span>
                      <div className="text-[10px] text-[#64748B] mt-0.5">
                        {hppDiff <= 0 ? 'Efisiensi Tercapai' : 'Kenaikan Biaya'}
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF9F6] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Bahan Baku</th>
                          <th className="py-2.5 px-3 text-right">{ver1Obj.version_name}</th>
                          <th className="py-2.5 px-3 text-right">{ver2Obj.version_name}</th>
                          <th className="py-2.5 px-3 text-right">Selisih</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {currentRecipe.ingredients?.map(ing => {
                          const v1Item = ver1Obj.ingredients_snapshot?.find(i => i.ingredient_id === ing.ingredient_id);
                          const v2Item = ver2Obj.ingredients_snapshot?.find(i => i.ingredient_id === ing.ingredient_id);
                          const qty1 = v1Item?.quantity || ing.quantity;
                          const qty2 = v2Item?.quantity || ing.quantity;
                          const diff = qty2 - qty1;

                          return (
                            <tr key={ing.id} className="hover:bg-[#F8FAFC]">
                              <td className="py-2 px-3 font-medium text-[#0F172A]">{ing.ingredient_name}</td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">{qty1} {ing.unit}</td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">{qty2} {ing.unit}</td>
                              <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums">
                                {diff === 0 ? (
                                  <span className="text-[#94A3B8]">-</span>
                                ) : diff < 0 ? (
                                  <span className="text-emerald-700">{diff} {ing.unit}</span>
                                ) : (
                                  <span className="text-amber-700">+{diff} {ing.unit}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
              <button
                type="button"
                onClick={() => setIsComparingVersions(false)}
                className="px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg"
              >
                Tutup Perbandingan
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* PRINT RECIPE CARD MODAL (Section 28) */}
      {isPrintModalOpen && currentRecipe && (
        <Modal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title="Print Recipe Card Preview"
          subtitle="Format cetak standar CULINOVA untuk operasional dapur dan arsip culinary audit."
          maxWidth="3xl"
        >
          <div className="space-y-6 text-xs">
            {/* Printable Container */}
            <div id="recipe-printable-card" className="p-8 bg-white border border-[#CBD5E1] rounded-lg space-y-6 text-[#0F172A]">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b-2 border-[#0F172A]">
                <div>
                  <div className="text-lg font-black tracking-tight uppercase">CULINOVA</div>
                  <div className="text-[10px] text-[#64748B] tracking-widest uppercase">Recipe & Food Cost Intelligence</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono">{currentRecipe.code}</div>
                  <div className="text-[10px] text-[#64748B]">{formatDate(currentRecipe.updated_at)}</div>
                </div>
              </div>

              {/* Recipe Title & Meta */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">{currentRecipe.name}</h2>
                  <div className="text-xs text-[#64748B] mt-1">
                    Kategori: {categories.find(c => c.id === currentRecipe.category_id)?.name || 'Makanan'} · Prep: {currentRecipe.prep_time}m · Cook: {currentRecipe.cook_time}m
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold">Yield Standar:</div>
                  <div className="text-base font-bold font-mono">{currentRecipe.yield_quantity} {currentRecipe.yield_unit}</div>
                </div>
              </div>

              {/* Cost Summary Box */}
              <div className="grid grid-cols-4 gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-center">
                <div>
                  <div className="text-[10px] text-[#64748B] uppercase">HPP / Porsi</div>
                  <div className="text-sm font-bold font-mono text-[#0F172A]">{formatRupiah(currentRecipe.hpp_per_portion)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#64748B] uppercase">Harga Jual</div>
                  <div className="text-sm font-bold font-mono text-[#2D4A3E]">{formatRupiah(currentRecipe.selling_price)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#64748B] uppercase">Food Cost %</div>
                  <div className="text-sm font-bold font-mono text-amber-700">{formatPercent(currentRecipe.food_cost_pct)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#64748B] uppercase">Margin %</div>
                  <div className="text-sm font-bold font-mono text-emerald-700">{formatPercent(currentRecipe.margin_pct)}</div>
                </div>
              </div>

              {/* Ingredients Table */}
              <div>
                <h4 className="font-bold uppercase tracking-wider text-xs mb-2">Ingredients Formula</h4>
                <table className="w-full text-left text-xs border border-[#E2E8F0]">
                  <thead className="bg-[#F1F5F9] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="p-2">Item Name</th>
                      <th className="p-2 text-right">Quantity</th>
                      <th className="p-2">Unit</th>
                      <th className="p-2 text-right">Unit Price</th>
                      <th className="p-2 text-right">Subtotal Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {currentRecipe.ingredients?.map(item => (
                      <tr key={item.id}>
                        <td className="p-2 font-medium">{item.ingredient_name}</td>
                        <td className="p-2 text-right font-mono">{item.quantity}</td>
                        <td className="p-2">{item.unit}</td>
                        <td className="p-2 text-right font-mono">{formatRupiah(item.unit_price)}</td>
                        <td className="p-2 text-right font-mono font-semibold">{formatRupiah(item.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-[#0F172A] font-bold">
                    <tr>
                      <td colSpan={4} className="p-2 text-right">TOTAL BATCH COST:</td>
                      <td className="p-2 text-right font-mono">{formatRupiah(currentRecipe.total_ingredient_cost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Method */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-xs">Standard Operating Procedure</h4>
                <p className="whitespace-pre-line text-xs leading-relaxed text-[#334155] border p-3 rounded bg-[#FAF9F6]">
                  {currentRecipe.instructions || 'N/A'}
                </p>
              </div>

              {currentRecipe.notes && (
                <div className="space-y-1">
                  <h4 className="font-bold uppercase tracking-wider text-xs">Notes & Critical Control Points</h4>
                  <p className="text-xs text-[#475569]">{currentRecipe.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2D4A3E] hover:bg-[#233a31] rounded-lg"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Sekarang</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ADD / EDIT RECIPE MODAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingRecipe(null);
        }}
        title={editingRecipe ? `Edit Resep: ${editingRecipe.name}` : 'Buat Resep Baru'}
        subtitle="Formulasi racikan, penentuan yield porsi, dan kalkulasi HPP otomatis."
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-5 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1">Kode Resep</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="input-pill font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#2B2118] mb-1">Nama Resep</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="input-pill"
                placeholder="Contoh: Ayam Geprek Sambal Bawang"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1">Kategori</label>
              <select
                value={formData.category_id}
                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                className="input-pill"
              >
                {categories
                  .filter(c => c.type === 'RECIPE')
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1">Yield (Porsi per Batch)</label>
              <input
                type="number"
                min="1"
                required
                value={formData.yield_quantity}
                onChange={e => setFormData({ ...formData, yield_quantity: Number(e.target.value) })}
                className="input-pill font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1">Satuan Yield</label>
              <input
                type="text"
                value={formData.yield_unit}
                onChange={e => setFormData({ ...formData, yield_unit: e.target.value })}
                className="input-pill"
                placeholder="Portion / Slice / Pcs"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#2B2118] mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="input-pill"
              >
                <option value="ACTIVE">Aktif</option>
                <option value="DRAFT">Draft</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>
          </div>

          {/* Photo Uploader (Google Drive + Sheets URL) */}
          <ImageUploader
            value={formData.photo_url}
            onChange={(url) => setFormData({ ...formData, photo_url: url })}
            entityType="recipe"
            entityName={formData.name || 'resep'}
            entityId={editingRecipe?.id}
            label="Foto Resep Masakan"
            helperText="Unggah foto sajian (JPG, JPEG, PNG, WEBP maks 5 MB). File tersimpan di Google Drive dan URL tercatat di Google Sheets."
          />

          {/* Recipe Ingredients Builder Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#0F172A]">Komposisi Bahan Baku & Sub-Resep</label>
              <button
                type="button"
                onClick={handleAddIngredientRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#2D4A3E] bg-[#2D4A3E]/10 hover:bg-[#2D4A3E]/20 rounded-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Bahan</span>
              </button>
            </div>

            <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9F6] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                  <tr>
                    <th className="p-2 w-28">Tipe</th>
                    <th className="p-2">Item Bahan / Sub-Resep</th>
                    <th className="p-2 w-28 text-right">Quantity</th>
                    <th className="p-2 w-24">Satuan</th>
                    <th className="p-2 w-12 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {formData.recipe_items.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC]">
                      <td className="p-2">
                        <select
                          value={row.ingredient_type}
                          onChange={e => handleItemChange(idx, 'ingredient_type', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-[#E2E8F0] rounded"
                        >
                          <option value="INGREDIENT">Bahan Baku</option>
                          <option value="SUB_RECIPE">Sub-Resep</option>
                        </select>
                      </td>
                      <td className="p-2">
                        {row.ingredient_type === 'INGREDIENT' ? (
                          <select
                            value={row.ingredient_id}
                            onChange={e => handleItemChange(idx, 'ingredient_id', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-[#E2E8F0] rounded font-medium"
                          >
                            {ingredients.map(ing => (
                              <option key={ing.id} value={ing.id}>
                                {ing.name} ({formatRupiah(ing.price_per_base_unit)}/{ing.base_unit})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={row.ingredient_id}
                            onChange={e => handleItemChange(idx, 'ingredient_id', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-[#E2E8F0] rounded font-medium"
                          >
                            {subRecipes.map(sub => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name} ({formatRupiah(sub.cost_per_unit)}/Porsi)
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          required
                          value={row.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-[#E2E8F0] rounded text-right font-mono"
                        />
                      </td>
                      <td className="p-2">
                        {row.ingredient_type === 'INGREDIENT' ? (
                          <select
                            value={row.unit}
                            onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-[#E2E8F0] rounded text-xs"
                          >
                            {units.map(u => (
                              <option key={u.id} value={u.name}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            disabled
                            value="Portion"
                            className="w-full px-2 py-1 bg-slate-100 border border-[#E2E8F0] rounded text-xs text-slate-600"
                          />
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientRow(idx)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          disabled={formData.recipe_items.length <= 1}
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

          {/* Real-time Financial Calculations Summary Box */}
          <div className="p-4 bg-[#FAF9F6] border border-[#CBD5E1] rounded-xl space-y-3">
            <div className="font-bold text-[#0F172A] flex items-center justify-between">
              <span>Estimasi Otomatis HPP & Harga Jual</span>
              <span className="font-mono text-emerald-800">Live Calculated</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2 bg-white rounded border border-[#E2E8F0]">
                <div className="text-[10px] text-[#64748B]">HPP Total Batch</div>
                <div className="text-sm font-bold font-mono text-[#0F172A]">
                  {formatRupiah(formCalculations.totalCost)}
                </div>
              </div>
              <div className="p-2 bg-white rounded border border-[#E2E8F0]">
                <div className="text-[10px] text-[#64748B]">HPP per Porsi</div>
                <div className="text-sm font-bold font-mono text-[#0F172A]">
                  {formatRupiah(formCalculations.hppPerPortion)}
                </div>
              </div>
              <div className="p-2 bg-white rounded border border-[#E2E8F0]">
                <div className="text-[10px] text-[#64748B]">Est. Harga Jual ({formData.target_food_cost_pct}%)</div>
                <div className="text-sm font-bold font-mono text-[#2D4A3E]">
                  {formatRupiah(formCalculations.estSellingPrice)}
                </div>
              </div>
              <div className="p-2 bg-white rounded border border-[#E2E8F0]">
                <div className="text-[10px] text-[#64748B]">Margin Keuntungan</div>
                <div className="text-sm font-bold font-mono text-emerald-700">
                  {formatPercent(formCalculations.marginPct)}
                </div>
              </div>
            </div>

            {/* Selling Price input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Target Food Cost %
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formData.target_food_cost_pct}
                    onChange={e => setFormData({ ...formData, target_food_cost_pct: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]">%</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Harga Jual Aktual (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[#64748B]">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.selling_price}
                    onChange={e => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg font-mono font-bold text-[#2D4A3E]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Instructions and notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Instruksi Memasak</label>
              <textarea
                rows={3}
                value={formData.instructions}
                onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2D4A3E]"
                placeholder="Langkah 1, 2, 3..."
              />
            </div>
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Catatan Chef</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2D4A3E]"
                placeholder="Kiat crispy, suhu minyak, masa simpan..."
              />
            </div>
          </div>

          {/* Versioning checkbox when editing */}
          {editingRecipe && (
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0F172A]">
                <input
                  type="checkbox"
                  checked={formData.create_new_version}
                  onChange={e => setFormData({ ...formData, create_new_version: e.target.checked })}
                  className="rounded text-[#2D4A3E] focus:ring-0"
                />
                <span>Simpan sebagai Versi Baru (Recipe Versioning)</span>
              </label>
              {formData.create_new_version && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Nama Versi (cth: Versi 2.1 Efisiensi Tepung)"
                    value={formData.version_name}
                    onChange={e => setFormData({ ...formData, version_name: e.target.value })}
                    className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Catatan Perubahan (cth: Pengurangan gramasi ayam 100g)"
                    value={formData.version_notes}
                    onChange={e => setFormData({ ...formData, version_notes: e.target.value })}
                    className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded text-xs"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-stone-200/60 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingRecipe(null);
              }}
              className="btn-pill-secondary"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-pill-primary"
            >
              {isSubmitting ? 'Memproses...' : editingRecipe ? 'Simpan Resep' : 'Buat Resep'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Resep?"
        message="Resep yang sedang aktif digunakan pada Menu Jual tidak dapat dihapus."
        confirmText="Hapus Resep"
        cancelText="Batal"
        isLoading={isSubmitting}
      />
    </div>
  );
};
