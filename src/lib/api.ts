import {
  Ingredient,
  Category,
  Unit,
  Recipe,
  SubRecipe,
  SalesMenu,
  IngredientPriceHistory,
  CostAlert,
  AppSettings,
  AuditLog,
} from '../types';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface DashboardData {
  kpis: {
    totalIngredients: number;
    totalRecipes: number;
    totalMenus: number;
    totalCategories?: number;
    avgFoodCost: number;
    avgMargin: number;
  };
  recentRecipes: {
    id: string;
    name: string;
    category: string;
    hpp: number;
    selling_price: number;
    food_cost: number;
    margin: number;
    updated: string;
    photo_url: string;
  }[];
  costAlerts: CostAlert[];
  highestFoodCostMenus: {
    id: string;
    name: string;
    recipe_name?: string;
    selling_price: number;
    hpp: number;
    food_cost: number;
    margin: number;
    photo_url: string;
  }[];
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const resJson: ApiResponse<T> = await response.json();

  if (!response.ok || !resJson.success) {
    throw new Error(resJson.message || 'Terjadi kesalahan pada sistem.');
  }

  return resJson.data as T;
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getSession: () => request<any>('/auth/session'),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),

  // Dashboard
  getDashboardData: (category?: string) =>
    request<DashboardData>(`/analytics/dashboard${category && category !== 'ALL' ? `?category=${category}` : ''}`),

  // Ingredients
  getIngredients: (params?: { search?: string; category?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    return request<Ingredient[]>(`/ingredients?${query.toString()}`);
  },
  createIngredient: (data: Partial<Ingredient>) =>
    request<Ingredient>('/ingredients', { method: 'POST', body: JSON.stringify(data) }),
  updateIngredient: (id: string, data: Partial<Ingredient> & { change_reason?: string }) =>
    request<Ingredient>(`/ingredients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIngredient: (id: string) =>
    request<{ id: string }>(`/ingredients/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: (type?: string) =>
    request<Category[]>(`/categories${type ? `?type=${type}` : ''}`),
  createCategory: (data: Partial<Category>) =>
    request<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Partial<Category>) =>
    request<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) =>
    request<{ id: string }>(`/categories/${id}`, { method: 'DELETE' }),

  // Units
  getUnits: () => request<Unit[]>('/units'),
  createUnit: (data: Partial<Unit>) =>
    request<Unit>('/units', { method: 'POST', body: JSON.stringify(data) }),

  // Recipes
  getRecipes: (params?: { search?: string; category?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    return request<Recipe[]>(`/recipes?${query.toString()}`);
  },
  getRecipeById: (id: string) => request<Recipe>(`/recipes/${id}`),
  createRecipe: (data: any) =>
    request<Recipe>('/recipes', { method: 'POST', body: JSON.stringify(data) }),
  updateRecipe: (id: string, data: any) =>
    request<Recipe>(`/recipes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecipe: (id: string) =>
    request<{ id: string }>(`/recipes/${id}`, { method: 'DELETE' }),
  activateRecipeVersion: (recipeId: string, versionId: string) =>
    request<Recipe>(`/recipes/${recipeId}/versions/${versionId}/activate`, { method: 'PUT' }),

  // Sub Recipes
  getSubRecipes: () => request<SubRecipe[]>('/sub-recipes'),
  createSubRecipe: (data: any) =>
    request<SubRecipe>('/sub-recipes', { method: 'POST', body: JSON.stringify(data) }),
  updateSubRecipe: (id: string, data: any) =>
    request<SubRecipe>(`/sub-recipes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubRecipe: (id: string) =>
    request<{ id: string }>(`/sub-recipes/${id}`, { method: 'DELETE' }),

  // Menus
  getSalesMenus: (params?: { search?: string; category?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    return request<SalesMenu[]>(`/menus?${query.toString()}`);
  },
  createSalesMenu: (data: any) =>
    request<SalesMenu>('/menus', { method: 'POST', body: JSON.stringify(data) }),
  updateSalesMenu: (id: string, data: any) =>
    request<SalesMenu>(`/menus/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSalesMenu: (id: string) =>
    request<{ id: string }>(`/menus/${id}`, { method: 'DELETE' }),

  // Price History
  getPriceHistory: (ingredientId?: string) =>
    request<IngredientPriceHistory[]>(`/price-history${ingredientId ? `?ingredient_id=${ingredientId}` : ''}`),

  // Settings
  getSettings: () => request<AppSettings>('/settings'),
  updateSettings: (data: Partial<AppSettings>) =>
    request<AppSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  resetDatabase: () =>
    request<null>('/settings/reset-database', { method: 'POST' }),

  // Google Sheets
  testSheetsConnection: () =>
    request<{ success: boolean; message: string; sheetCount?: number; title?: string }>('/sheets/test-connection', { method: 'POST' }),
  initializeSheets: () =>
    request<{ success: boolean; createdSheets: string[] }>('/sheets/initialize', { method: 'POST' }),

  // Audit Logs
  getAuditLogs: () => request<AuditLog[]>('/audit-logs'),

  // Reports
  getReports: (type?: string) => request<any>(`/reports${type ? `?type=${type}` : ''}`),
};
