export interface Ingredient {
  id: string;
  code: string;
  name: string;
  category_id: string;
  unit_id: string;
  purchase_price: number;
  base_unit: string;
  price_per_base_unit: number;
  supplier: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'INGREDIENT' | 'RECIPE' | 'MENU';
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  name: string;
  base_unit: string;
  conversion_factor: number; // e.g. 1 Kg = 1000 Gram, factor = 1000
  type: 'WEIGHT' | 'VOLUME' | 'UNIT' | 'PORTION';
  status: 'ACTIVE' | 'INACTIVE';
}

export interface RecipeIngredientItem {
  id: string;
  recipe_id: string;
  ingredient_type: 'INGREDIENT' | 'SUB_RECIPE';
  ingredient_id: string;
  ingredient_name?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  cost: number;
  percentage?: number;
  created_at: string;
}

export interface RecipeVersion {
  id: string;
  recipe_id: string;
  version_number: number;
  version_name: string;
  hpp: number;
  hpp_per_portion: number;
  change_notes: string;
  ingredients_snapshot: RecipeIngredientItem[];
  status: 'ACTIVE' | 'ARCHIVED';
  created_at: string;
}

export interface Recipe {
  id: string;
  code: string;
  name: string;
  category_id: string;
  photo_url: string;
  photo_file_id?: string;
  description: string;
  yield_quantity: number;
  yield_unit: string;
  prep_time: number; // in minutes
  cook_time: number; // in minutes
  instructions: string;
  notes: string;
  status: 'ACTIVE' | 'DRAFT' | 'INACTIVE';
  active_version_id?: string;
  // Calculated fields
  total_ingredient_cost: number;
  hpp_per_portion: number;
  target_food_cost_pct: number;
  selling_price: number;
  food_cost_pct: number;
  gross_profit: number;
  margin_pct: number;
  ingredients?: RecipeIngredientItem[];
  versions?: RecipeVersion[];
  created_at: string;
  updated_at: string;
}

export interface SubRecipeIngredientItem {
  id: string;
  sub_recipe_id: string;
  ingredient_id: string;
  ingredient_name?: string;
  quantity: number;
  unit: string;
  cost: number;
}

export interface SubRecipe {
  id: string;
  code: string;
  name: string;
  yield_quantity: number;
  yield_unit: string;
  total_cost: number;
  cost_per_unit: number;
  status: 'ACTIVE' | 'INACTIVE';
  ingredients?: SubRecipeIngredientItem[];
  created_at: string;
  updated_at: string;
}

export interface SalesMenu {
  id: string;
  code: string;
  name: string;
  category_id: string;
  recipe_id: string;
  recipe_name?: string;
  selling_price: number;
  hpp: number;
  food_cost: number;
  gross_profit: number;
  margin: number;
  photo_url: string;
  photo_file_id?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface IngredientPriceHistory {
  id: string;
  ingredient_id: string;
  ingredient_name?: string;
  old_price: number;
  new_price: number;
  change_percent?: number;
  effective_date: string;
  supplier: string;
  reason: string;
  created_at: string;
}

export interface CostAlert {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  old_price: number;
  new_price: number;
  increase_pct: number;
  affected_recipes: {
    recipe_id: string;
    recipe_name: string;
    old_hpp: number;
    new_hpp: number;
    change_pct: number;
  }[];
  date: string;
}

export interface AppSettings {
  app_name: string;
  currency: string;
  food_cost_target: number;
  margin_target: number;
  food_cost_threshold_low: number;
  food_cost_threshold_high: number;
  price_rounding: 'NONE' | '500' | '1000';
  date_format: string;
  google_sheet_id: string;
  google_client_email: string;
  google_is_connected: boolean;
}

export interface AuditLog {
  id: string;
  user: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PRICE_CHANGE' | 'VERSION_ACTIVATE' | 'SYSTEM';
  module: string;
  record_id: string;
  details: string;
  timestamp: string;
}
