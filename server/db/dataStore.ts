import {
  Ingredient,
  Category,
  Unit,
  Recipe,
  RecipeIngredientItem,
  SubRecipe,
  SubRecipeIngredientItem,
  SalesMenu,
  IngredientPriceHistory,
  CostAlert,
  AppSettings,
  AuditLog,
  RecipeVersion,
} from './types.ts';
import {
  initialIngredients,
  initialCategories,
  initialUnits,
  initialRecipes,
  initialSubRecipes,
  initialSalesMenus,
  initialPriceHistory,
  initialSettings,
  initialAuditLogs,
} from './seedData.ts';
import { googleSheetsService } from './googleSheetsService.ts';

export class CulinovaDataStore {
  public ingredients: Ingredient[] = [];
  public categories: Category[] = [];
  public units: Unit[] = [];
  public recipes: Recipe[] = [];
  public subRecipes: SubRecipe[] = [];
  public salesMenus: SalesMenu[] = [];
  public priceHistory: IngredientPriceHistory[] = [];
  public settings: AppSettings = { ...initialSettings };
  public auditLogs: AuditLog[] = [];

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults() {
    this.ingredients = JSON.parse(JSON.stringify(initialIngredients));
    this.categories = JSON.parse(JSON.stringify(initialCategories));
    this.units = JSON.parse(JSON.stringify(initialUnits));
    this.recipes = JSON.parse(JSON.stringify(initialRecipes));
    this.subRecipes = JSON.parse(JSON.stringify(initialSubRecipes));
    this.salesMenus = JSON.parse(JSON.stringify(initialSalesMenus));
    this.priceHistory = JSON.parse(JSON.stringify(initialPriceHistory));
    this.settings = JSON.parse(JSON.stringify(initialSettings));
    this.auditLogs = JSON.parse(JSON.stringify(initialAuditLogs));

    this.recalculateAll();
  }

  // --- Calculations ---

  public calculateBaseUnitPrice(purchasePrice: number, unitId: string): { baseUnit: string; pricePerBaseUnit: number } {
    const unit = this.units.find(u => u.id === unitId || u.name.toLowerCase() === unitId.toLowerCase());
    if (!unit) {
      return { baseUnit: 'Unit', pricePerBaseUnit: purchasePrice };
    }
    const factor = unit.conversion_factor || 1;
    const pricePerBase = purchasePrice / factor;
    return {
      baseUnit: unit.base_unit || unit.name,
      pricePerBaseUnit: Number(pricePerBase.toFixed(4)),
    };
  }

  public calculateSubRecipeCost(subRecipeId: string): { totalCost: number; costPerUnit: number } {
    const sub = this.subRecipes.find(s => s.id === subRecipeId);
    if (!sub || !sub.ingredients) return { totalCost: 0, costPerUnit: 0 };

    let total = 0;
    sub.ingredients.forEach(item => {
      const ing = this.ingredients.find(i => i.id === item.ingredient_id);
      if (ing) {
        // Calculate cost based on ingredient price_per_base_unit
        // Check unit conversion
        const itemUnit = this.units.find(u => u.name.toLowerCase() === item.unit.toLowerCase() || u.id === item.unit);
        const factor = itemUnit ? itemUnit.conversion_factor : 1;
        const totalBaseQty = item.quantity * factor;
        const itemCost = totalBaseQty * ing.price_per_base_unit;
        item.cost = Math.round(itemCost);
        total += itemCost;
      }
    });

    sub.total_cost = Math.round(total);
    sub.cost_per_unit = sub.yield_quantity > 0 ? Math.round(total / sub.yield_quantity) : 0;
    return { totalCost: sub.total_cost, costPerUnit: sub.cost_per_unit };
  }

  public calculateRecipeHPP(recipe: Recipe): Recipe {
    let totalCost = 0;
    const ingredients = recipe.ingredients || [];

    ingredients.forEach(item => {
      if (item.ingredient_type === 'INGREDIENT') {
        const ing = this.ingredients.find(i => i.id === item.ingredient_id);
        if (ing) {
          const itemUnit = this.units.find(u => u.name.toLowerCase() === item.unit.toLowerCase() || u.id === item.unit);
          const factor = itemUnit ? itemUnit.conversion_factor : 1;
          const totalBaseQty = item.quantity * factor;
          const unitPrice = ing.price_per_base_unit;
          item.unit_price = unitPrice;
          item.cost = Math.round(totalBaseQty * unitPrice);
          item.ingredient_name = ing.name;
          totalCost += item.cost;
        }
      } else if (item.ingredient_type === 'SUB_RECIPE') {
        const sub = this.subRecipes.find(s => s.id === item.ingredient_id);
        if (sub) {
          item.unit_price = sub.cost_per_unit;
          item.cost = Math.round(item.quantity * sub.cost_per_unit);
          item.ingredient_name = sub.name;
          totalCost += item.cost;
        }
      }
    });

    // Compute percentages
    ingredients.forEach(item => {
      item.percentage = totalCost > 0 ? Number(((item.cost / totalCost) * 100).toFixed(1)) : 0;
    });

    recipe.total_ingredient_cost = Math.round(totalCost);
    recipe.hpp_per_portion = recipe.yield_quantity > 0 ? Math.round(totalCost / recipe.yield_quantity) : 0;

    // Selling price and margin calculation
    const sellingPrice = recipe.selling_price || 0;
    if (sellingPrice > 0) {
      recipe.food_cost_pct = Number(((recipe.hpp_per_portion / sellingPrice) * 100).toFixed(1));
      recipe.gross_profit = sellingPrice - recipe.hpp_per_portion;
      recipe.margin_pct = Number(((recipe.gross_profit / sellingPrice) * 100).toFixed(1));
    } else {
      recipe.food_cost_pct = 0;
      recipe.gross_profit = 0;
      recipe.margin_pct = 0;
    }

    return recipe;
  }

  public recalculateAll() {
    // 1. Recalculate all sub-recipes
    this.subRecipes.forEach(sub => {
      this.calculateSubRecipeCost(sub.id);
    });

    // 2. Recalculate all recipes
    this.recipes.forEach(rec => {
      this.calculateRecipeHPP(rec);
    });

    // 3. Recalculate all sales menus
    this.salesMenus.forEach(menu => {
      const rec = this.recipes.find(r => r.id === menu.recipe_id);
      if (rec) {
        menu.recipe_name = rec.name;
        // If HPP not manually customized with extra sides, align with recipe HPP
        if (!menu.hpp || menu.hpp === 0) {
          menu.hpp = rec.hpp_per_portion;
        }
        if (menu.selling_price > 0) {
          menu.food_cost = Number(((menu.hpp / menu.selling_price) * 100).toFixed(1));
          menu.gross_profit = menu.selling_price - menu.hpp;
          menu.margin = Number(((menu.gross_profit / menu.selling_price) * 100).toFixed(1));
        }
      }
    });
  }

  // Circular dependency detector
  public checkCircularRecipeDependency(recipeId: string, visited: Set<string> = new Set()): boolean {
    if (visited.has(recipeId)) return true;
    visited.add(recipeId);

    const recipe = this.recipes.find(r => r.id === recipeId);
    if (!recipe || !recipe.ingredients) return false;

    for (const item of recipe.ingredients) {
      if (item.ingredient_type === 'SUB_RECIPE') {
        const sub = this.subRecipes.find(s => s.id === item.ingredient_id);
        if (sub && sub.ingredients) {
          // Check if subrecipe points back or uses recipes
          // Subrecipes only use raw ingredients, but ensure no self loops
          if (visited.has(sub.id)) return true;
        }
      }
    }
    visited.delete(recipeId);
    return false;
  }

  public getCostAlerts(): CostAlert[] {
    const alerts: CostAlert[] = [];
    const significantChanges = this.priceHistory.filter(ph => (ph.change_percent || 0) >= 3);

    for (const chg of significantChanges) {
      const ing = this.ingredients.find(i => i.id === chg.ingredient_id);
      if (!ing) continue;

      const affected: CostAlert['affected_recipes'] = [];

      for (const rec of this.recipes) {
        const hasIng = rec.ingredients?.some(
          ri => ri.ingredient_type === 'INGREDIENT' && ri.ingredient_id === ing.id
        );
        if (hasIng) {
          // Estimate old HPP
          const oldUnitPrice = this.calculateBaseUnitPrice(chg.old_price, ing.unit_id).pricePerBaseUnit;
          const currentUnitPrice = ing.price_per_base_unit;
          const ri = rec.ingredients?.find(i => i.ingredient_id === ing.id);
          const factor = ri ? (this.units.find(u => u.name.toLowerCase() === ri.unit.toLowerCase())?.conversion_factor || 1) : 1;
          const qty = (ri?.quantity || 0) * factor;
          const diffPerBatch = qty * (currentUnitPrice - oldUnitPrice);
          const diffPerPortion = rec.yield_quantity > 0 ? diffPerBatch / rec.yield_quantity : 0;
          const oldHpp = Math.max(0, rec.hpp_per_portion - diffPerPortion);
          const changePct = oldHpp > 0 ? Number((((rec.hpp_per_portion - oldHpp) / oldHpp) * 100).toFixed(1)) : 0;

          affected.push({
            recipe_id: rec.id,
            recipe_name: rec.name,
            old_hpp: Math.round(oldHpp),
            new_hpp: rec.hpp_per_portion,
            change_pct: changePct,
          });
        }
      }

      alerts.push({
        id: `alert_${chg.id}`,
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        old_price: chg.old_price,
        new_price: chg.new_price,
        increase_pct: Number((chg.change_percent || 0).toFixed(1)),
        affected_recipes: affected,
        date: chg.effective_date,
      });
    }

    return alerts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public addAuditLog(user: string, action: AuditLog['action'], module: string, recordId: string, details: string) {
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user: user || 'Gabriel (User)',
      action,
      module,
      record_id: recordId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(newLog);
    if (this.auditLogs.length > 200) {
      this.auditLogs.pop();
    }
  }
}

export const culinovaStore = new CulinovaDataStore();
