import express, { Request, Response } from 'express';

import multer from 'multer';

import { culinovaStore } from './db/dataStore.ts';

import { googleSheetsService } from './db/googleSheetsService.ts';

import { googleDriveService } from './db/googleDriveService.ts';

import { cloudinaryService } from './db/cloudinaryService.ts';

import { Recipe, RecipeIngredientItem, RecipeVersion, Ingredient, SalesMenu, SubRecipe, SubRecipeIngredientItem } from './db/types.ts';



export const apiRouter = express.Router();



apiRouter.use(express.json());



// Multer in-memory storage for handling image uploads

const upload = multer({

  storage: multer.memoryStorage(),

  limits: {

    fileSize: 5 * 1024 * 1024, // 5 MB max

  },

});



// Helper for consistent JSON responses

const sendSuccess = (res: Response, data: any, message?: string) => {

  return res.status(200).json({ success: true, data, message });

};



const sendError = (res: Response, message: string, statusCode = 400) => {

  return res.status(statusCode).json({ success: false, message });

};



// --- AUTHENTICATION ---

apiRouter.post('/auth/login', (req: Request, res: Response) => {

  const { username, password } = req.body;

  const adminUser = process.env.ADMIN_USERNAME || 'admin';

  const adminPass = process.env.ADMIN_PASSWORD || 'culinova2026';



  if ((username === adminUser || username === 'admin') && (password === adminPass || password === 'culinova2026')) {

    const userSession = {

      username: username || 'admin',

      role: 'Administrator',

      name: 'Gabriel (Executive Chef)',

      token: `culinova_token_${Date.now()}`,

    };

    culinovaStore.addAuditLog(userSession.name, 'SYSTEM', 'Auth', userSession.username, 'User logged in successfully');

    return sendSuccess(res, userSession, 'Login successful');

  }



  return sendError(res, 'Username atau password tidak valid.', 401);

});



apiRouter.get('/auth/session', (req: Request, res: Response) => {

  return sendSuccess(res, {

    authenticated: true,

    user: {

      username: 'admin',

      role: 'Administrator',

      name: 'Gabriel (Executive Chef)',

    },

  });

});



apiRouter.post('/auth/logout', (req: Request, res: Response) => {

  return sendSuccess(res, null, 'Logged out successfully');

});



// --- IMAGE UPLOAD (CLOUDINARY) ---

apiRouter.post('/upload-image', (req: Request, res: Response) => {

  upload.single('image')(req, res, async (err: any) => {

    if (err) {

      if (err.code === 'LIMIT_FILE_SIZE') {

        return res.status(400).json({

          success: false,

          message: 'File terlalu besar. Maksimal 5 MB.',

        });

      }

      return res.status(400).json({

        success: false,

        message: err.message || 'Gagal memproses file gambar.',

      });

    }



    try {

      if (!req.file) {

        return res.status(400).json({

          success: false,

          message: 'Tidak ada file gambar yang diunggah.',

        });

      }



      const type = (req.body.type === 'menu' ? 'menu' : 'recipe') as 'recipe' | 'menu';

      const entityName = req.body.name || req.body.title || req.file.originalname;



      const result = await cloudinaryService.uploadImage(

        req.file.buffer,

        req.file.originalname,

        req.file.mimetype,

        type,

        entityName

      );



      if (!result.success) {

        return res.status(400).json({

          success: false,

          message: result.message || 'Failed to upload image',

        });

      }



      // If recipe_id or menu_id is passed, save the Cloudinary URL/public ID

      // directly to Google Sheets without changing the rest of the recipe/menu logic.

      if (req.body.recipe_id && result.url && result.fileId) {

        const rec = culinovaStore.recipes.find(r => r.id === req.body.recipe_id);

        if (rec) {

          rec.photo_url = result.url;

          rec.photo_file_id = result.fileId;

          rec.updated_at = new Date().toISOString();

          googleSheetsService.updateRecipePhotoInSheet(rec.id, result.url, result.fileId).catch(() => {});

          culinovaStore.addAuditLog('Gabriel', 'UPDATE', 'Recipes', rec.id, `Uploaded photo for recipe ${rec.name}`);

        }

      } else if (req.body.menu_id && result.url && result.fileId) {

        const menu = culinovaStore.salesMenus.find(m => m.id === req.body.menu_id);

        if (menu) {

          menu.photo_url = result.url;

          menu.photo_file_id = result.fileId;

          menu.updated_at = new Date().toISOString();

          googleSheetsService.updateMenuPhotoInSheet(menu.id, result.url, result.fileId).catch(() => {});

          culinovaStore.addAuditLog('Gabriel', 'UPDATE', 'Sales Menu', menu.id, `Uploaded photo for menu ${menu.name}`);

        }

      }



      return res.status(200).json({

        success: true,

        fileId: result.fileId,

        fileName: result.fileName,

        url: result.url,

      });

    } catch (uploadErr: any) {

      console.error('Error in /upload-image:', uploadErr?.message || uploadErr);

      return res.status(500).json({

        success: false,

        message: uploadErr?.message || 'Failed to upload image',

      });

    }

  });

});



apiRouter.post('/cloudinary/test-connection', async (_req: Request, res: Response) => {

  return sendSuccess(res, {

    configured: cloudinaryService.isConfigured(),

    message: cloudinaryService.isConfigured()

      ? 'Cloudinary credentials are configured.'

      : 'Cloudinary belum dikonfigurasi di environment variables.',

  });

});



// Legacy Google Drive diagnostic endpoint kept temporarily for compatibility.

// Image uploads no longer use Google Drive.

apiRouter.post('/drive/test-connection', async (req: Request, res: Response) => {

  const result = await googleDriveService.testConnection();

  return sendSuccess(res, result);

});



// --- DASHBOARD & ANALYTICS ---

apiRouter.get('/analytics/dashboard', (req: Request, res: Response) => {

  const { category } = req.query;



  const totalIngredients = culinovaStore.ingredients.filter(i => i.status === 'ACTIVE').length;

  const totalRecipes = culinovaStore.recipes.filter(r => r.status === 'ACTIVE').length;

  const totalMenus = culinovaStore.salesMenus.filter(m => m.status === 'ACTIVE').length;

  const totalCategories = culinovaStore.categories.filter(c => c.status === 'ACTIVE').length;



  let activeRecipes = culinovaStore.recipes.filter(r => r.status === 'ACTIVE' && r.selling_price > 0);

  if (category && category !== 'ALL') {

    activeRecipes = activeRecipes.filter(r => r.category_id === category);

  }



  const avgFoodCost = activeRecipes.length > 0

    ? Number((activeRecipes.reduce((sum, r) => sum + r.food_cost_pct, 0) / activeRecipes.length).toFixed(1))

    : 0;

  const avgMargin = activeRecipes.length > 0

    ? Number((activeRecipes.reduce((sum, r) => sum + r.margin_pct, 0) / activeRecipes.length).toFixed(1))

    : 0;



  // Recently updated recipes

  let recentRecipesList = [...culinovaStore.recipes];

  if (category && category !== 'ALL') {

    recentRecipesList = recentRecipesList.filter(r => r.category_id === category);

  }

  const recentRecipes = recentRecipesList

    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    .slice(0, 5)

    .map(r => {

      const cat = culinovaStore.categories.find(c => c.id === r.category_id);

      return {

        id: r.id,

        name: r.name,

        category: cat?.name || 'Makanan',

        hpp: r.hpp_per_portion,

        selling_price: r.selling_price,

        food_cost: r.food_cost_pct,

        margin: r.margin_pct,

        updated: r.updated_at,

        photo_url: r.photo_url,

      };

    });



  // Cost alerts

  const costAlerts = culinovaStore.getCostAlerts().slice(0, 5);



  // Highest Food Cost menus

  let menuList = culinovaStore.salesMenus.filter(m => m.status === 'ACTIVE');

  if (category && category !== 'ALL') {

    menuList = menuList.filter(m => m.category_id === category);

  }

  const highestFoodCostMenus = menuList

    .sort((a, b) => b.food_cost - a.food_cost)

    .slice(0, 5)

    .map(m => ({

      id: m.id,

      name: m.name,

      recipe_name: m.recipe_name,

      selling_price: m.selling_price,

      hpp: m.hpp,

      food_cost: m.food_cost,

      margin: m.margin,

      photo_url: m.photo_url,

    }));



  return sendSuccess(res, {

    kpis: {

      totalIngredients,

      totalRecipes,

      totalMenus,

      totalCategories,

      avgFoodCost,

      avgMargin,

    },

    recentRecipes,

    costAlerts,

    highestFoodCostMenus,

  });

});



// --- INGREDIENTS CRUD ---

apiRouter.get('/ingredients', (req: Request, res: Response) => {

  const { search, category, status } = req.query;

  let list = [...culinovaStore.ingredients];



  if (search) {

    const q = String(search).toLowerCase();

    list = list.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q));

  }

  if (category && category !== 'ALL') {

    list = list.filter(i => i.category_id === category);

  }

  if (status && status !== 'ALL') {

    list = list.filter(i => i.status === status);

  }



  // Sort by name

  list.sort((a, b) => a.name.localeCompare(b.name));

  return sendSuccess(res, list);

});



apiRouter.post('/ingredients', (req: Request, res: Response) => {

  const { code, name, category_id, unit_id, purchase_price, supplier, notes, status } = req.body;



  if (!name || !name.trim()) return sendError(res, 'Nama bahan baku tidak boleh kosong.');

  if (purchase_price === undefined || purchase_price < 0) return sendError(res, 'Harga beli tidak boleh negatif.');

  if (!code || !code.trim()) return sendError(res, 'Kode bahan baku tidak boleh kosong.');



  const existing = culinovaStore.ingredients.find(i => i.code.toLowerCase() === code.trim().toLowerCase());

  if (existing) return sendError(res, `Kode bahan baku '${code}' sudah digunakan.`);



  const unitCalc = culinovaStore.calculateBaseUnitPrice(Number(purchase_price), unit_id || 'unit_kg');



  const newIng: Ingredient = {

    id: `ing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,

    code: code.trim().toUpperCase(),

    name: name.trim(),

    category_id: category_id || 'cat_ing_staples',

    unit_id: unit_id || 'unit_kg',

    purchase_price: Number(purchase_price),

    base_unit: unitCalc.baseUnit,

    price_per_base_unit: unitCalc.pricePerBaseUnit,

    supplier: supplier?.trim() || 'General Supplier',

    status: status || 'ACTIVE',

    notes: notes || '',

    created_at: new Date().toISOString(),

    updated_at: new Date().toISOString(),

  };



  culinovaStore.ingredients.push(newIng);

  culinovaStore.addAuditLog('Gabriel', 'CREATE', 'Ingredients', newIng.id, `Created ingredient: ${newIng.name} (${newIng.code})`);



  return sendSuccess(res, newIng, 'Bahan baku berhasil ditambahkan.');

});



apiRouter.put('/ingredients/:id', (req: Request, res: Response) => {

  const { id } = req.params;

  const ingIndex = culinovaStore.ingredients.findIndex(i => i.id === id);

  if (ingIndex === -1) return sendError(res, 'Bahan baku tidak ditemukan.', 404);



  const existing = culinovaStore.ingredients[ingIndex];

  const { code, name, category_id, unit_id, purchase_price, supplier, notes, status, change_reason } = req.body;



  if (name && !name.trim()) return sendError(res, 'Nama bahan baku tidak boleh kosong.');

  if (purchase_price !== undefined && purchase_price < 0) return sendError(res, 'Harga beli tidak boleh negatif.');



  if (code && code.trim().toLowerCase() !== existing.code.toLowerCase()) {

    const duplicate = culinovaStore.ingredients.find(i => i.id !== id && i.code.toLowerCase() === code.trim().toLowerCase());

    if (duplicate) return sendError(res, `Kode '${code}' sudah digunakan oleh bahan lain.`);

  }



  const newPrice = purchase_price !== undefined ? Number(purchase_price) : existing.purchase_price;

  const oldPrice = existing.purchase_price;

  const priceChanged = Math.abs(newPrice - oldPrice) > 0.01;



  const unitIdToUse = unit_id || existing.unit_id;

  const unitCalc = culinovaStore.calculateBaseUnitPrice(newPrice, unitIdToUse);



  const updatedIng: Ingredient = {

    ...existing,

    code: code ? code.trim().toUpperCase() : existing.code,

    name: name ? name.trim() : existing.name,

    category_id: category_id || existing.category_id,

    unit_id: unitIdToUse,

    purchase_price: newPrice,

    base_unit: unitCalc.baseUnit,

    price_per_base_unit: unitCalc.pricePerBaseUnit,

    supplier: supplier !== undefined ? supplier.trim() : existing.supplier,

    status: status || existing.status,

    notes: notes !== undefined ? notes : existing.notes,

    updated_at: new Date().toISOString(),

  };



  culinovaStore.ingredients[ingIndex] = updatedIng;



  // Log price history if changed

  if (priceChanged) {

    const diffPct = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;

    const historyEntry = {

      id: `ph_${Date.now()}`,

      ingredient_id: updatedIng.id,

      ingredient_name: updatedIng.name,

      old_price: oldPrice,

      new_price: newPrice,

      change_percent: Number(diffPct.toFixed(2)),

      effective_date: new Date().toISOString(),

      supplier: updatedIng.supplier,

      reason: change_reason || 'Pembaruan berkala harga supplier',

      created_at: new Date().toISOString(),

    };

    culinovaStore.priceHistory.unshift(historyEntry);

    culinovaStore.addAuditLog('Gabriel', 'PRICE_CHANGE', 'Ingredients', updatedIng.id, `Price changed from Rp${oldPrice.toLocaleString()} to Rp${newPrice.toLocaleString()} (${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1)}%)`);

  } else {

    culinovaStore.addAuditLog('Gabriel', 'UPDATE', 'Ingredients', updatedIng.id, `Updated ingredient ${updatedIng.name}`);

  }



  // Recalculate dependent recipes, sub-recipes, and menus

  culinovaStore.recalculateAll();



  return sendSuccess(res, updatedIng, 'Bahan baku berhasil diperbarui.');

});



apiRouter.delete('/ingredients/:id', (req: Request, res: Response) => {

  const { id } = req.params;

  const ing = culinovaStore.ingredients.find(i => i.id === id);

  if (!ing) return sendError(res, 'Bahan baku tidak ditemukan.', 404);



  // Check if used in recipes

  const usedInRecipes = culinovaStore.recipes.filter(r =>

    r.ingredients?.some(ri => ri.ingredient_type === 'INGREDIENT' && ri.ingredient_id === id)

  );

  if (usedInRecipes.length > 0) {

    const names = usedInRecipes.map(r => r.name).join(', ');

    return sendError(res, `Bahan '${ing.name}' tidak dapat dihapus karena masih digunakan dalam resep: ${names}.`);

  }



  // Check if used in sub-recipes

  const usedInSub = culinovaStore.subRecipes.filter(s =>

    s.ingredients?.some(si => si.ingredient_id === id)

  );

  if (usedInSub.length > 0) {

    const names = usedInSub.map(s => s.name).join(', ');

    return sendError(res, `Bahan '${ing.name}' tidak dapat dihapus karena masih digunakan dalam sub-resep: ${names}.`);

  }



  culinovaStore.ingredients = culinovaStore.ingredients.filter(i => i.id !== id);

  culinovaStore.addAuditLog('Gabriel', 'DELETE', 'Ingredients', id, `Deleted ingredient ${ing.name}`);



  return sendSuccess(res, { id }, `Bahan '${ing.name}' berhasil dihapus.`);

});



// --- CATEGORIES CRUD ---

apiRouter.get('/categories', (req: Request, res: Response) => {

  const { type } = req.query;

  let list = culinovaStore.categories;

  if (type) {

    list = list.filter(c => c.type === type);

  }

  return sendSuccess(res, list);

});



apiRouter.post('/categories', (req: Request, res: Response) => {

  const { name, type } = req.body;

  if (!name || !name.trim()) return sendError(res, 'Nama kategori tidak boleh kosong.');



  const newCat = {

    id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,

    name: name.trim(),

    type: type || 'RECIPE',

    status: 'ACTIVE' as const,

    created_at: new Date().toISOString(),

    updated_at: new Date().toISOString(),

  };



  culinovaStore.categories.push(newCat);

  culinovaStore.addAuditLog('Gabriel', 'CREATE', 'Categories', newCat.id, `Created category: ${newCat.name}`);

  return sendSuccess(res, newCat, 'Kategori berhasil ditambahkan.');

});



apiRouter.put('/categories/:id', (req: Request, res: Response) => {

  const { id } = req.params;

  const cat = culinovaStore.categories.find(c => c.id === id);

  if (!cat) return sendError(res, 'Kategori tidak ditemukan.', 404);



  const { name, status } = req.body;

  if (name !== undefined) cat.name = name.trim();

  if (status !== undefined) cat.status = status;

  cat.updated_at = new Date().toISOString();



  culinovaStore.addAuditLog('Gabriel', 'UPDATE', 'Categories', id, `Updated category ${cat.name}`);

  return sendSuccess(res, cat, 'Kategori berhasil diperbarui.');

});



apiRouter.delete('/categories/:id', (req: Request, res: Response) => {

  const { id } = req.params;

  const cat = culinovaStore.categories.find(c => c.id === id);

  if (!cat) return sendError(res, 'Kategori tidak ditemukan.', 404);



  // Check usage

  const usedInIng = culinovaStore.ingredients.some(i => i.category_id === id);

  const usedInRec = culinovaStore.recipes.some(r => r.category_id === id);

  const usedInMenu = culinovaStore.salesMenus.some(m => m.category_id === id);



  if (usedInIng || usedInRec || usedInMenu) {

    // Soft disable as per specification

    cat.status = 'INACTIVE';

    cat.updated_at = new Date().toISOString();

    return sendSuccess(res, cat, `Kategori '${cat.name}' sedang digunakan sehingga statusnya dinonaktifkan (soft disable).`);

  }



  culinovaStore.categories = culinovaStore.categories.filter(c => c.id !== id);

  return sendSuccess(res, { id }, 'Kategori berhasil dihapus.');

});



// --- UNITS CRUD ---

apiRouter.get('/units', (req: Request, res: Response) => {

  return sendSuccess(res, culinovaStore.units);

});



apiRouter.post('/units', (req: Request, res: Response) => {

  const { name, base_unit, conversion_factor, type } = req.body;

  if (!name || !name.trim()) return sendError(res, 'Nama satuan tidak boleh kosong.');

  if (!conversion_factor || conversion_factor <= 0) return sendError(res, 'Faktor konversi harus lebih besar dari 0.');



  const newUnit = {

    id: `unit_${Date.now()}`,

    name: name.trim(),

    base_unit: base_unit?.trim() || name.trim(),

    conversion_factor: Number(conversion_factor),

    type: type || 'WEIGHT',

    status: 'ACTIVE' as const,

  };

  culinovaStore.units.push(newUnit);

  return sendSuccess(res, newUnit, 'Satuan berhasil ditambahkan.');

});



// --- SUB-RECIPES CRUD ---

apiRouter.get('/sub-recipes', (req: Request, res: Response) => {

  return sendSuccess(res, culinovaStore.subRecipes);

});



apiRouter.post('/sub-recipes', (req: Request, res: Response) => {

  const { code, name, yield_quantity, yield_unit, ingredients } = req.body;

  if (!name || !name.trim()) return sendError(res, 'Nama sub-resep tidak boleh kosong.');

  if (!yield_quantity || yield_quantity <= 0) return sendError(res, 'Yield harus lebih besar dari 0.');



  const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const subCode = code?.trim() || `SUB-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;



  const subItems: SubRecipeIngredientItem[] = (ingredients || []).map((item: any, idx: number) => ({

    id: `sri_${Date.now()}_${idx}`,

    sub_recipe_id: subId,

    ingredient_id: item.ingredient_id,

    quantity: Number(item.quantity) || 1,

    unit: item.unit || 'Gram',

    cost: 0,

  }));



  const newSub: SubRecipe = {

    id: subId,

    code: subCode,

    name: name.trim(),

    yield_quantity: Number(yield_quantity),

    yield_unit: yield_unit || 'Portion',

    total_cost: 0,

    cost_per_unit: 0,

    status: 'ACTIVE',

    ingredients: subItems,

    created_at: new Date().toISOString(),

    updated_at: new Date().toISOString(),

  };



  culinovaStore.subRecipes.push(newSub);

  culinovaStore.calculateSubRecipeCost(newSub.id);

  culinovaStore.recalculateAll();



  culinovaStore.addAuditLog('Gabriel', 'CREATE', 'Sub-Recipes', newSub.id, `Created sub-recipe: ${newSub.name}`);

  return sendSuccess(res, newSub, 'Sub-resep berhasil dibuat.');

});



apiRouter.put('/sub-recipes/:id', (req: Request, res: Response) => {

  const { id } = req.params;

  const sub = culinovaStore.subRecipes.find(s => s.id === id);

  if (!sub) return sendError(res, 'Sub-resep tidak ditemukan.', 404);



  const { code, name, yield_quantity, yield_unit, ingredients, status } = req.body;

  if (name !== undefined) sub.name = name.trim();

  if (code !== undefined) sub.code = code.trim();

  if (yield_quantity !== undefined) sub.yield_quantity = Number(yield_quantity);

  if (yield_unit !== undefined) sub.yield_unit = yield_unit;

  if (status !== undefined) sub.status = status;



  if (ingredients && Array.isArray(ingredients)) {

    sub.ingredients = ingredients.map((item: any, idx: number) => ({

      id: item.id || `sri_${Date.now()}_${idx}`,

      sub_recipe_id: id,

      ingredient_id: item.ingredient_id,

      quantity: Number(item.quantity) || 1,

      unit: item.unit || 'Gram',

      cost: 0,

    }));

  }



  sub.updated_at = new Date().toISOString();

  culinovaStore.calculateSubRecipeCost(sub.id);

  culinovaStore.recalculateAll();



  culinovaStore.addAuditLog('Gabriel', 'UPDATE', 'Sub-Recipes', id, `Updated sub-recipe ${sub.name}`);

  return sendSuccess(res, sub, 'Sub-resep berhasil diperbarui.');

});



apiRouter.delete('/sub-recipes/:id', (req: Request, res: Response) => {

  const { id } = req.params;

  const sub = culinovaStore.subRecipes.find(s => s.id === id);

  if (!sub) return sendError(res, 'Sub-resep tidak ditemukan.', 404);



  // Check if used in recipes

  const used = culinovaStore.recipes.filter(r =>

    r.ingredients?.some(ri => ri.ingredient_type === 'SUB_RECIPE' && ri.ingredient_id === id)

  );

  if (used.length > 0) {

    const list = used.map(r => r.name).join(', ');

    return sendError(res, `Sub-resep '${sub.name}' tidak dapat dihapus karena digunakan dalam resep: ${list}.`);

  }



  culinovaStore.subRecipes = culinovaStore.subRecipes.filter(s => s.id !== id);

  culinovaStore.addAuditLog('Gabriel', 'DELETE', 'Sub-Recipes', id, `Deleted sub-recipe ${sub.name}`);

  return sendSuccess(res, { id }, 'Sub-resep berhasil dihapus.');

});



// --- RECIPES CRUD ---

apiRouter.get('/recipes', async (req: Request, res: Response) => {
  const { search, category, status } = req.query;
  if (googleSheetsService.isConfigured()) {
    try {
      let sheetRecipes = await googleSheetsService.getRecipes();
      if (sheetRecipes.length === 0 && culinovaStore.recipes.length > 0) {
        for (const recipe of culinovaStore.recipes) await googleSheetsService.upsertRecipe(recipe);
        sheetRecipes = await googleSheetsService.getRecipes();
      }
      if (sheetRecipes.length > 0) {
        const currentById = new Map<string, any>(culinovaStore.recipes.map(r => [r.id, r] as [string, any]));
        culinovaStore.recipes = sheetRecipes.map((r: any) => ({ ...(currentById.get(r.id) || {}), ...r })) as Recipe[];
        culinovaStore.recalculateAll();
      }
    } catch (err) { console.warn('Recipe hydration from Google Sheets failed:', err); }
  }
  let list = [...culinovaStore.recipes];



  if (search) {

    const q = String(search).toLowerCase();

    list = list.filter(r => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));

  }

  if (category && category !== 'ALL') {

    list = list.filter(r => r.category_id === category);

  }

  if (status && status !== 'ALL') {

    list = list.filter(r => r.status === status);

  }



  return sendSuccess(res, list);

});



apiRouter.get('/recipes/:id', (req: Request, res: Response) => {

  const { id } = req.params;

  const recipe = culinovaStore.recipes.find(r => r.id === id);

  if (!recipe) return sendError(res, 'Resep tidak ditemukan.', 404);

  return sendSuccess(res, recipe);

});



apiRouter.post('/recipes', async (req: Request, res: Response) => {

  const {

    code,

    name,

    category_id,

    photo_url,

    description,

    yield_quantity,

    yield_unit,

    prep_time,

    cook_time,

    instructions,

    notes,

    status,

    selling_price,

    target_food_cost_pct,

    ingredients,

  } = req.body;



  if (!name || !name.trim()) return sendError(res, 'Nama resep tidak boleh kosong.');

  if (!code || !code.trim()) return sendError(res, 'Kode resep tidak boleh kosong.');

  if (yield_quantity !== undefined && yield_quantity <= 0) return sendError(res, 'Yield harus lebih besar dari 0.');



  const existingCode = culinovaStore.recipes.find(r => r.code.toLowerCase() === code.trim().toLowerCase());

  if (existingCode) return sendError(res, `Kode resep '${code}' sudah digunakan.`);



  const recipeId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const defaultPhoto = photo_url || '/src/assets/images/dish_ayam_geprek_1791109817096.jpg';



  const initialVersionId = `ver_${Date.now()}`;



  const recipeIngredients: RecipeIngredientItem[] = (ingredients || []).map((item: any, idx: number) => ({

    id: `ri_${Date.now()}_${idx}`,

    recipe_id: recipeId,

    ingredient_type: item.ingredient_type || 'INGREDIENT',

    ingredient_id: item.ingredient_id,

    quantity: Number(item.quantity) || 1,

    unit: item.unit || 'Gram',

    unit_price: 0,

    cost: 0,

    created_at: new Date().toISOString(),

  }));



  let newRecipe: Recipe = {

    id: recipeId,

    code: code.trim().toUpperCase(),

    name: name.trim(),

    category_id: category_id || 'cat_rec_makanan',

    photo_url: defaultPhoto,

    description: description || '',

    yield_quantity: Number(yield_quantity) || 1,

    yield_unit: yield_unit || 'Portion',

    prep_time: Number(prep_time) || 15,

    cook_time: Number(cook_time) || 15,

    instructions: instructions || '',

    notes: notes || '',

    status: status || 'ACTIVE',

    active_version_id: initialVersionId,

    total_ingredient_cost: 0,

    hpp_per_portion: 0,

    target_food_cost_pct: Number(target_food_cost_pct) || 35,

    selling_price: Number(selling_price) || 0,

    food_cost_pct: 0,

    gross_profit: 0,

    margin_pct: 0,

    ingredients: recipeIngredients,

    versions: [],

    created_at: new Date().toISOString(),

    updated_at: new Date().toISOString(),

  };



  newRecipe = culinovaStore.calculateRecipeHPP(newRecipe);



  // Initial version snapshot

  const v1: RecipeVersion = {

    id: initialVersionId,

    recipe_id: recipeId,

    version_number: 1,

    version_name: 'Versi 1.0 (Rilis Awal)',

    hpp: newRecipe.total_ingredient_cost,

    hpp_per_portion: newRecipe.hpp_per_portion,

    change_notes: 'Pembuatan resep awal',

    ingredients_snapshot: JSON.parse(JSON.stringify(newRecipe.ingredients)),

    status: 'ACTIVE',

    created_at: new Date().toISOString(),

  };

  newRecipe.versions = [v1];



  culinovaStore.recipes.push(newRecipe);
  try {
    await googleSheetsService.upsertRecipe(newRecipe);
  } catch (err: any) {
    culinovaStore.recipes = culinovaStore.recipes.filter(r => r.id !== newRecipe.id);
    return sendError(res, err.message || 'Gagal menyimpan resep ke Google Sheets.', 500);
  }
  culinovaStore.addAuditLog('Gabriel', 'CREATE', 'Recipes', newRecipe.id, `Created recipe ${newRecipe.name} (HPP: Rp${newRecipe.hpp_per_portion.toLocaleString()})`);



  return sendSuccess(res, newRecipe, 'Resep berhasil dibuat dan disimpan ke database.');

});



apiRouter.put('/recipes/:id', async (req: Request, res: Response) => {

  const { id } = req.params;

  const recipeIndex = culinovaStore.recipes.findIndex(r => r.id === id);

  if (recipeIndex === -1) return sendError(res, 'Resep tidak ditemukan.', 404);



  const existing = culinovaStore.recipes[recipeIndex];

  const {

    code,

    name,

    category_id,

    photo_url,

    description,

    yield_quantity,

    yield_unit,

    prep_time,

    cook_time,

    instructions,

    notes,

    status,

    selling_price,

    target_food_cost_pct,

    ingredients,

    create_new_version,

    version_name,

    version_notes,

  } = req.body;



  if (code && code.trim().toLowerCase() !== existing.code.toLowerCase()) {

    const dup = culinovaStore.recipes.find(r => r.id !== id && r.code.toLowerCase() === code.trim().toLowerCase());

    if (dup) return sendError(res, `Kode '${code}' sudah digunakan resep lain.`);

  }



  let updatedIngredients = existing.ingredients || [];

  if (ingredients && Array.isArray(ingredients)) {

    updatedIngredients = ingredients.map((item: any, idx: number) => ({

      id: item.id || `ri_${Date.now()}_${idx}`,

      recipe_id: id,

      ingredient_type: item.ingredient_type || 'INGREDIENT',

      ingredient_id: item.ingredient_id,

      quantity: Number(item.quantity) || 1,

      unit: item.unit || 'Gram',

      unit_price: 0,

      cost: 0,

      created_at: item.created_at || new Date().toISOString(),

    }));

  }



  let updatedRecipe: Recipe = {

    ...existing,

    code: code ? code.trim().toUpperCase() : existing.code,

    name: name ? name.trim() : existing.name,

    category_id: category_id || existing.category_id,

    photo_url: photo_url || existing.photo_url,

    description: description !== undefined ? description : existing.description,

    yield_quantity: yield_quantity ? Number(yield_quantity) : existing.yield_quantity,

    yield_unit: yield_unit || existing.yield_unit,

    prep_time: prep_time !== undefined ? Number(prep_time) : existing.prep_time,

    cook_time: cook_time !== undefined ? Number(cook_time) : existing.cook_time,

    instructions: instructions !== undefined ? instructions : existing.instructions,

    notes: notes !== undefined ? notes : existing.notes,

    status: status || existing.status,

    selling_price: selling_price !== undefined ? Number(selling_price) : existing.selling_price,

    target_food_cost_pct: target_food_cost_pct !== undefined ? Number(target_food_cost_pct) : existing.target_food_cost_pct,

    ingredients: updatedIngredients,

    updated_at: new Date().toISOString(),

  };



  // Check circular dependency

  culinovaStore.recipes[recipeIndex] = updatedRecipe;

  if (culinovaStore.checkCircularRecipeDependency(id)) {

    culinovaStore.recipes[recipeIndex] = existing;

    return sendError(res, 'Circular recipe dependency detected.');

  }



  updatedRecipe = culinovaStore.calculateRecipeHPP(updatedRecipe);



  // If user requested creating a new version

  if (create_new_version) {

    const versions = updatedRecipe.versions || [];

    const nextVerNum = (versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) : 0) + 1;

    // Archive old active version

    versions.forEach(v => { v.status = 'ARCHIVED'; });



    const newVersion: RecipeVersion = {

      id: `ver_${Date.now()}`,

      recipe_id: id,

      version_number: nextVerNum,

      version_name: version_name || `Versi ${nextVerNum}.0`,

      hpp: updatedRecipe.total_ingredient_cost,

      hpp_per_portion: updatedRecipe.hpp_per_portion,

      change_notes: version_notes || 'Pembaruan bahan dan formulasi',

      ingredients_snapshot: JSON.parse(JSON.stringify(updatedRecipe.ingredients)),

      status: 'ACTIVE',

      created_at: new Date().toISOString(),

    };

    versions.push(newVersion);

    updatedRecipe.versions = versions;

    updatedRecipe.active_version_id = newVersion.id;



    culinovaStore.addAuditLog('Gabriel', 'CREATE', 'Recipe Versions', newVersion.id, `Created ${newVersion.version_name} for ${updatedRecipe.name}`);

  }



  culinovaStore.recipes[recipeIndex] = updatedRecipe;
  culinovaStore.recalculateAll();
  try {
    await googleSheetsService.upsertRecipe(updatedRecipe);
  } catch (err: any) {
    culinovaStore.recipes[recipeIndex] = existing;
    return sendError(res, err.message || 'Gagal menyimpan perubahan resep ke Google Sheets.', 500);
  }
  culinovaStore.addAuditLog('Gabriel', 'UPDATE', 'Recipes', id, `Updated recipe ${updatedRecipe.name}`);

  return sendSuccess(res, updatedRecipe, 'Resep berhasil diperbarui dan disimpan ke database.');

});



apiRouter.delete('/recipes/:id', async (req: Request, res: Response) => {

  const { id } = req.params;

  const rec = culinovaStore.recipes.find(r => r.id === id);

  if (!rec) return sendError(res, 'Resep tidak ditemukan.', 404);



  // Check if used in sales menu

  const linkedMenu = culinovaStore.salesMenus.filter(m => m.recipe_id === id);

  if (linkedMenu.length > 0) {

    const names = linkedMenu.map(m => m.name).join(', ');

    return sendError(res, `Resep '${rec.name}' tidak dapat dihapus karena digunakan pada Menu Jual: ${names}.`);

  }



  culinovaStore.recipes = culinovaStore.recipes.filter(r => r.id !== id);
  try {
    await googleSheetsService.deleteRecipe(id);
  } catch (err: any) {
    culinovaStore.recipes.push(rec);
    return sendError(res, err.message || 'Gagal menghapus resep dari Google Sheets.', 500);
  }
  culinovaStore.addAuditLog('Gabriel', 'DELETE', 'Recipes', id, `Deleted recipe ${rec.name}`);

  return sendSuccess(res, { id }, 'Resep berhasil dihapus.');

});



// Version Activation & Comparison

apiRouter.put('/recipes/:id/versions/:versionId/activate', (req: Request, res: Response) => {

  const { id, versionId } = req.params;

  const recipe = culinovaStore.recipes.find(r => r.id === id);

  if (!recipe) return sendError(res, 'Resep tidak ditemukan.', 404);



  const targetVer = recipe.versions?.find(v => v.id === versionId);

  if (!targetVer) return sendError(res, 'Versi resep tidak ditemukan.', 404);



  recipe.versions?.forEach(v => {

    v.status = v.id === versionId ? 'ACTIVE' : 'ARCHIVED';

  });

  recipe.active_version_id = versionId;



  // Restore snapshot if available

  if (targetVer.ingredients_snapshot && targetVer.ingredients_snapshot.length > 0) {

    recipe.ingredients = JSON.parse(JSON.stringify(targetVer.ingredients_snapshot));

  }



  culinovaStore.calculateRecipeHPP(recipe);

  culinovaStore.recalculateAll();



  culinovaStore.addAuditLog('Gabriel', 'VERSION_ACTIVATE', 'Recipes', id, `Activated version ${targetVer.version_name} for ${recipe.name}`);

  return sendSuccess(res, recipe, `Versi '${targetVer.version_name}' diaktifkan.`);

});



// --- SALES MENUS CRUD ---

apiRouter.get('/menus', async (req: Request, res: Response) => {
  const { search, category, status } = req.query;
  if (googleSheetsService.isConfigured()) {
    try {
      let sheetMenus = await googleSheetsService.getMenus();
      if (sheetMenus.length === 0 && culinovaStore.salesMenus.length > 0) {
        for (const menu of culinovaStore.salesMenus) await googleSheetsService.upsertMenu(menu);
        sheetMenus = await googleSheetsService.getMenus();
      }
      if (sheetMenus.length > 0) {
        const recipeMap = new Map<string, any>(culinovaStore.recipes.map(r => [r.id, r] as [string, any]));
        culinovaStore.salesMenus = sheetMenus.map((m: any) => ({ ...m, recipe_name: recipeMap.get(m.recipe_id)?.name || m.recipe_name || '' })) as SalesMenu[];
        culinovaStore.recalculateAll();
      }
    } catch (err) { console.warn('Menu hydration from Google Sheets failed:', err); }
  }
  let list = [...culinovaStore.salesMenus];



  if (search) {

    const q = String(search).toLowerCase();

    list = list.filter(m => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q));

  }

  if (category && category !== 'ALL') {

    list = list.filter(m => m.category_id === category);

  }

  if (status && status !== 'ALL') {

    list = list.filter(m => m.status === status);

  }



  return sendSuccess(res, list);

});



apiRouter.post('/menus', async (req: Request, res: Response) => {

  const { code, name, category_id, recipe_id, selling_price, hpp_override, photo_url, status } = req.body;



  if (!name || !name.trim()) return sendError(res, 'Nama menu jual tidak boleh kosong.');

  if (!recipe_id) return sendError(res, 'Pilih resep acuan untuk menu jual ini.');

  if (selling_price === undefined || selling_price < 0) return sendError(res, 'Harga jual tidak boleh negatif.');



  const recipe = culinovaStore.recipes.find(r => r.id === recipe_id);

  if (!recipe) return sendError(res, 'Resep acuan tidak ditemukan.');



  const effectiveHpp = hpp_override !== undefined && Number(hpp_override) > 0

    ? Number(hpp_override)

    : recipe.hpp_per_portion;



  const sp = Number(selling_price);

  const gp = sp - effectiveHpp;

  const fc = sp > 0 ? Number(((effectiveHpp / sp) * 100).toFixed(1)) : 0;

  const margin = sp > 0 ? Number(((gp / sp) * 100).toFixed(1)) : 0;



  const newMenu: SalesMenu = {

    id: `menu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,

    code: code?.trim().toUpperCase() || `MNU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,

    name: name.trim(),

    category_id: category_id || 'cat_menu_main',

    recipe_id,

    recipe_name: recipe.name,

    selling_price: sp,

    hpp: effectiveHpp,

    food_cost: fc,

    gross_profit: gp,

    margin,

    photo_url: photo_url || recipe.photo_url,

    status: status || 'ACTIVE',

    created_at: new Date().toISOString(),

    updated_at: new Date().toISOString(),

  };



  culinovaStore.salesMenus.push(newMenu);
  try {
    await googleSheetsService.upsertMenu(newMenu);
  } catch (err: any) {
    culinovaStore.salesMenus = culinovaStore.salesMenus.filter(m => m.id !== newMenu.id);
    return sendError(res, err.message || 'Gagal menyimpan menu ke Google Sheets.', 500);
  }
  culinovaStore.addAuditLog('Gabriel', 'CREATE', 'Sales Menu', newMenu.id, `Created sales menu ${newMenu.name} (Selling Price: Rp${sp.toLocaleString()})`);



  return sendSuccess(res, newMenu, 'Menu jual berhasil ditambahkan dan disimpan ke database.');

});



apiRouter.put('/menus/:id', async (req: Request, res: Response) => {

  const { id } = req.params;

  const menu = culinovaStore.salesMenus.find(m => m.id === id);

  if (!menu) return sendError(res, 'Menu tidak ditemukan.', 404);



  const { code, name, category_id, recipe_id, selling_price, hpp, photo_url, status } = req.body;

  if (name !== undefined) menu.name = name.trim();

  if (code !== undefined) menu.code = code.trim().toUpperCase();

  if (category_id !== undefined) menu.category_id = category_id;

  if (photo_url !== undefined) menu.photo_url = photo_url;

  if (status !== undefined) menu.status = status;



  if (recipe_id !== undefined) {

    const rec = culinovaStore.recipes.find(r => r.id === recipe_id);

    if (rec) {

      menu.recipe_id = recipe_id;

      menu.recipe_name = rec.name;

      if (hpp === undefined) {

        menu.hpp = rec.hpp_per_portion;

      }

    }

  }



  if (hpp !== undefined) menu.hpp = Number(hpp);

  if (selling_price !== undefined) menu.selling_price = Number(selling_price);



  menu.gross_profit = menu.selling_price - menu.hpp;

  menu.food_cost = menu.selling_price > 0 ? Number(((menu.hpp / menu.selling_price) * 100).toFixed(1)) : 0;

  menu.margin = menu.selling_price > 0 ? Number(((menu.gross_profit / menu.selling_price) * 100).toFixed(1)) : 0;

  menu.updated_at = new Date().toISOString();



  try {
    await googleSheetsService.upsertMenu(menu);
  } catch (err: any) {
    return sendError(res, err.message || 'Gagal menyimpan perubahan menu ke Google Sheets.', 500);
  }
  culinovaStore.addAuditLog('Gabriel', 'UPDATE', 'Sales Menu', id, `Updated sales menu ${menu.name}`);
  return sendSuccess(res, menu, 'Menu jual berhasil diperbarui dan disimpan ke database.');

});



apiRouter.delete('/menus/:id', async (req: Request, res: Response) => {

  const { id } = req.params;

  const menu = culinovaStore.salesMenus.find(m => m.id === id);

  if (!menu) return sendError(res, 'Menu tidak ditemukan.', 404);



  culinovaStore.salesMenus = culinovaStore.salesMenus.filter(m => m.id !== id);
  try {
    await googleSheetsService.deleteMenu(id);
  } catch (err: any) {
    culinovaStore.salesMenus.push(menu);
    return sendError(res, err.message || 'Gagal menghapus menu dari Google Sheets.', 500);
  }
  culinovaStore.addAuditLog('Gabriel', 'DELETE', 'Sales Menu', id, `Deleted sales menu ${menu.name}`);

  return sendSuccess(res, { id }, 'Menu jual berhasil dihapus.');

});



// --- PRICE HISTORY ---

apiRouter.get('/price-history', (req: Request, res: Response) => {

  const { ingredient_id } = req.query;

  let list = culinovaStore.priceHistory;

  if (ingredient_id) {

    list = list.filter(ph => ph.ingredient_id === ingredient_id);

  }

  return sendSuccess(res, list);

});



// --- SETTINGS ---

apiRouter.get('/settings', (req: Request, res: Response) => {

  culinovaStore.settings.google_is_connected = googleSheetsService.isConfigured();

  culinovaStore.settings.google_sheet_id = googleSheetsService.getSpreadsheetId() || process.env.GOOGLE_SHEET_ID || '';

  culinovaStore.settings.google_client_email = process.env.GOOGLE_CLIENT_EMAIL || '';

  return sendSuccess(res, culinovaStore.settings);

});



apiRouter.put('/settings', (req: Request, res: Response) => {

  const { food_cost_target, margin_target, food_cost_threshold_low, food_cost_threshold_high, price_rounding, app_name } = req.body;



  if (food_cost_target !== undefined) {

    if (food_cost_target <= 0 || food_cost_target >= 100) {

      return sendError(res, 'Target Food Cost harus lebih besar dari 0 dan kurang dari 100.');

    }

    culinovaStore.settings.food_cost_target = Number(food_cost_target);

  }



  if (margin_target !== undefined) culinovaStore.settings.margin_target = Number(margin_target);

  if (food_cost_threshold_low !== undefined) culinovaStore.settings.food_cost_threshold_low = Number(food_cost_threshold_low);

  if (food_cost_threshold_high !== undefined) culinovaStore.settings.food_cost_threshold_high = Number(food_cost_threshold_high);

  if (price_rounding !== undefined) culinovaStore.settings.price_rounding = price_rounding;

  if (app_name !== undefined) culinovaStore.settings.app_name = app_name;



  culinovaStore.addAuditLog('Gabriel', 'UPDATE', 'Settings', 'app_settings', 'Updated application settings');

  return sendSuccess(res, culinovaStore.settings, 'Pengaturan berhasil disimpan.');

});



// Reset database to initial seed data

apiRouter.post('/settings/reset-database', (req: Request, res: Response) => {

  culinovaStore.resetToDefaults();

  culinovaStore.addAuditLog('Gabriel', 'SYSTEM', 'Database', 'reset', 'Database restored to initial seed dataset');

  return sendSuccess(res, null, 'Database berhasil di-reset ke data bawaan Culinova.');

});



// --- GOOGLE SHEETS TEST & SYNC ---

apiRouter.post('/sheets/test-connection', async (req: Request, res: Response) => {

  const result = await googleSheetsService.testConnection();

  return sendSuccess(res, result);

});



apiRouter.post('/sheets/initialize', async (req: Request, res: Response) => {

  try {

    const result = await googleSheetsService.initializeAllSheets();

    culinovaStore.addAuditLog('Gabriel', 'SYSTEM', 'Google Sheets', 'init', 'Initialized Google Sheets headers and sheets');

    return sendSuccess(res, result, 'Google Sheets berhasil diinisialisasi dengan seluruh tabel yang diperlukan.');

  } catch (err: any) {

    return sendError(res, err.message || 'Gagal menginisialisasi Google Sheets.');

  }

});



// --- AUDIT LOGS ---

apiRouter.get('/audit-logs', (req: Request, res: Response) => {

  return sendSuccess(res, culinovaStore.auditLogs);

});



// --- REPORTS ---

apiRouter.get('/reports', (req: Request, res: Response) => {

  const { type } = req.query; // 'recipes', 'ingredients', 'hpp', 'food_cost', 'price_history'



  const data = {

    recipes: culinovaStore.recipes.map(r => ({

      code: r.code,

      name: r.name,

      category: culinovaStore.categories.find(c => c.id === r.category_id)?.name || '-',

      yield: `${r.yield_quantity} ${r.yield_unit}`,

      total_cost: r.total_ingredient_cost,

      hpp: r.hpp_per_portion,

      selling_price: r.selling_price,

      food_cost_pct: r.food_cost_pct,

      margin_pct: r.margin_pct,

      status: r.status,

      updated_at: r.updated_at,

    })),

    ingredients: culinovaStore.ingredients.map(i => ({

      code: i.code,

      name: i.name,

      category: culinovaStore.categories.find(c => c.id === i.category_id)?.name || '-',

      purchase_price: i.purchase_price,

      unit: culinovaStore.units.find(u => u.id === i.unit_id)?.name || i.unit_id,

      base_unit: i.base_unit,

      price_per_base_unit: i.price_per_base_unit,

      supplier: i.supplier,

      status: i.status,

    })),

    price_history: culinovaStore.priceHistory.map(ph => ({

      ingredient: ph.ingredient_name,

      old_price: ph.old_price,

      new_price: ph.new_price,

      change_percent: ph.change_percent,

      supplier: ph.supplier,

      reason: ph.reason,

      effective_date: ph.effective_date,

    })),

    menus: culinovaStore.salesMenus.map(m => ({

      code: m.code,

      name: m.name,

      recipe: m.recipe_name,

      selling_price: m.selling_price,

      hpp: m.hpp,

      food_cost_pct: m.food_cost,

      gross_profit: m.gross_profit,

      margin_pct: m.margin,

      status: m.status,

    })),

  };



  return sendSuccess(res, data);

});
