import { google, sheets_v4 } from 'googleapis';

export interface SheetSchema {
  name: string;
  headers: string[];
}

export const REQUIRED_SHEETS: SheetSchema[] = [
  {
    name: 'ingredients',
    headers: [
      'id', 'code', 'name', 'category_id', 'unit_id', 'purchase_price',
      'base_unit', 'price_per_base_unit', 'supplier', 'status', 'notes',
      'created_at', 'updated_at'
    ]
  },
  {
    name: 'categories',
    headers: ['id', 'name', 'type', 'status', 'created_at', 'updated_at']
  },
  {
    name: 'units',
    headers: ['id', 'name', 'base_unit', 'conversion_factor', 'type', 'status']
  },
  {
    name: 'recipes',
    headers: [
      'id', 'code', 'name', 'category_id', 'photo_url', 'description',
      'yield_quantity', 'yield_unit', 'prep_time', 'cook_time', 'instructions',
      'notes', 'status', 'active_version_id', 'total_ingredient_cost', 'hpp_per_portion',
      'target_food_cost_pct', 'selling_price', 'food_cost_pct', 'gross_profit',
      'margin_pct', 'created_at', 'updated_at', 'photo_file_id'
    ]
  },
  {
    name: 'recipe_ingredients',
    headers: ['id', 'recipe_id', 'ingredient_type', 'ingredient_id', 'quantity', 'unit', 'cost', 'created_at']
  },
  {
    name: 'sub_recipes',
    headers: ['id', 'code', 'name', 'yield_quantity', 'yield_unit', 'total_cost', 'cost_per_unit', 'status', 'created_at', 'updated_at']
  },
  {
    name: 'sub_recipe_ingredients',
    headers: ['id', 'sub_recipe_id', 'ingredient_id', 'quantity', 'unit', 'cost']
  },
  {
    name: 'menus',
    headers: [
      'id', 'code', 'name', 'category_id', 'recipe_id', 'selling_price',
      'hpp', 'food_cost', 'gross_profit', 'margin', 'photo_url', 'status',
      'created_at', 'updated_at', 'photo_file_id'
    ]
  },
  {
    name: 'ingredient_price_history',
    headers: ['id', 'ingredient_id', 'old_price', 'new_price', 'effective_date', 'supplier', 'reason', 'created_at']
  },
  {
    name: 'recipe_versions',
    headers: ['id', 'recipe_id', 'version_number', 'version_name', 'hpp', 'change_notes', 'status', 'created_at']
  },
  {
    name: 'settings',
    headers: ['key', 'value']
  },
  {
    name: 'audit_logs',
    headers: ['id', 'user', 'action', 'module', 'record_id', 'details', 'timestamp']
  }
];

class GoogleSheetsService {
  private sheetsClient: sheets_v4.Sheets | null = null;
  private spreadsheetId: string = '';
  private cache: Map<string, { data: any[][]; timestamp: number }> = new Map();
  private cacheTTLMs = 10000; // 10 seconds cache

  constructor() {
    this.initClient();
  }

  private initClient() {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.GOOGLE_SHEET_ID;

    this.spreadsheetId = sheetId || '';

    if (clientEmail && privateKey && sheetId) {
      try {
        const auth = new google.auth.JWT({
          email: clientEmail,
          key: privateKey,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        this.sheetsClient = google.sheets({ version: 'v4', auth });
      } catch (err) {
        console.error('Failed to initialize Google Sheets JWT client:', (err as Error).message);
        this.sheetsClient = null;
      }
    } else {
      this.sheetsClient = null;
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.sheetsClient && this.spreadsheetId);
  }

  public getSpreadsheetId(): string {
    return this.spreadsheetId;
  }

  public async testConnection(): Promise<{ success: boolean; message: string; sheetCount?: number; title?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Google Sheets credentials (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID) are not configured in environment variables.',
      };
    }

    try {
      const response = await this.sheetsClient!.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const title = response.data.properties?.title || 'Untitled';
      const sheetCount = response.data.sheets?.length || 0;

      return {
        success: true,
        message: `Successfully connected to Google Spreadsheet: "${title}" (${sheetCount} sheets found).`,
        sheetCount,
        title,
      };
    } catch (error: any) {
      console.error('Google Sheets connection error:', error.message);
      return {
        success: false,
        message: 'Unable to connect to database. Please verify service account permission and spreadsheet ID.',
      };
    }
  }

  public async getSheetData(sheetName: string, forceFresh = false): Promise<any[][]> {
    if (!this.isConfigured()) {
      throw new Error('Google Sheets is not configured');
    }

    const cached = this.cache.get(sheetName);
    if (!forceFresh && cached && Date.now() - cached.timestamp < this.cacheTTLMs) {
      return cached.data;
    }

    try {
      const res = await this.sheetsClient!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:Z1000`,
      });

      const rows = res.data.values || [];
      this.cache.set(sheetName, { data: rows, timestamp: Date.now() });
      return rows;
    } catch (err: any) {
      console.error(`Error reading sheet ${sheetName}:`, err.message);
      throw new Error('Unable to connect to database. Please try again.');
    }
  }

  public async appendRow(sheetName: string, values: any[]): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await this.sheetsClient!.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values],
        },
      });
      this.cache.delete(sheetName);
      return true;
    } catch (err: any) {
      console.error(`Error appending row to ${sheetName}:`, err.message);
      throw new Error('Unable to connect to database. Please try again.');
    }
  }

  public async updateRow(sheetName: string, rowIndex1Based: number, values: any[]): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await this.sheetsClient!.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A${rowIndex1Based}:Z${rowIndex1Based}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values],
        },
      });
      this.cache.delete(sheetName);
      return true;
    } catch (err: any) {
      console.error(`Error updating row in ${sheetName}:`, err.message);
      throw new Error('Unable to connect to database. Please try again.');
    }
  }

  public async deleteRow(sheetName: string, rowIndex0Based: number): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      // First get sheetId integer
      const meta = await this.sheetsClient!.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetName);
      if (!sheet || sheet.properties?.sheetId === undefined) {
        throw new Error(`Sheet ${sheetName} not found`);
      }

      await this.sheetsClient!.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheet.properties.sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex0Based,
                  endIndex: rowIndex0Based + 1,
                },
              },
            },
          ],
        },
      });
      this.cache.delete(sheetName);
      return true;
    } catch (err: any) {
      console.error(`Error deleting row from ${sheetName}:`, err.message);
      throw new Error('Unable to connect to database. Please try again.');
    }
  }

  public async batchUpdate(sheetName: string, rows: any[][]): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await this.sheetsClient!.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:Z${rows.length}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rows,
        },
      });
      this.cache.delete(sheetName);
      return true;
    } catch (err: any) {
      console.error(`Error batch updating ${sheetName}:`, err.message);
      throw new Error('Unable to connect to database. Please try again.');
    }
  }

  public async initializeAllSheets(): Promise<{ success: boolean; createdSheets: string[] }> {
    if (!this.isConfigured()) {
      throw new Error('Google Sheets is not configured');
    }

    try {
      const meta = await this.sheetsClient!.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const existingSheetNames = new Set((meta.data.sheets || []).map(s => s.properties?.title));
      const createdSheets: string[] = [];

      // Add missing sheets
      const addSheetRequests = REQUIRED_SHEETS.filter(s => !existingSheetNames.has(s.name)).map(s => ({
        addSheet: {
          properties: {
            title: s.name,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      }));

      if (addSheetRequests.length > 0) {
        await this.sheetsClient!.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: addSheetRequests,
          },
        });
      }

      // Populate headers for all required sheets
      for (const sheet of REQUIRED_SHEETS) {
        createdSheets.push(sheet.name);
        await this.sheetsClient!.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheet.name}!A1:${String.fromCharCode(64 + sheet.headers.length)}1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [sheet.headers],
          },
        });
      }

      this.cache.clear();
      return { success: true, createdSheets };
    } catch (err: any) {
      console.error('Error initializing sheets:', err.message);
      throw new Error('Unable to connect to database. Please try again.');
    }
  }

  public async updateRecipePhotoInSheet(recipeId: string, photoUrl: string, photoFileId: string): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const rows = await this.getSheetData('recipes', true);
      if (rows.length < 2) return false;
      const headerRow = rows[0];
      const photoUrlColIdx = headerRow.indexOf('photo_url');
      const photoFileIdColIdx = headerRow.indexOf('photo_file_id');

      const rowIndex0Based = rows.findIndex((r, idx) => idx > 0 && (r[0] === recipeId || r[1] === recipeId));
      if (rowIndex0Based === -1) return false;

      const targetRow = [...rows[rowIndex0Based]];
      if (photoUrlColIdx !== -1) {
        targetRow[photoUrlColIdx] = photoUrl;
      }
      if (photoFileIdColIdx !== -1) {
        targetRow[photoFileIdColIdx] = photoFileId;
      } else {
        targetRow.push(photoFileId);
      }

      await this.updateRow('recipes', rowIndex0Based + 1, targetRow);
      return true;
    } catch (err: any) {
      console.warn('Could not sync recipe photo to Google Sheets:', err.message);
      return false;
    }
  }


  // ---------------------------------------------------------------------------
  // Recipe & Menu persistence helpers
  // These methods are intentionally built on top of the existing low-level
  // Google Sheets methods so the current authentication/connection behavior
  // remains unchanged.
  // ---------------------------------------------------------------------------

  private async findRowByIdOrCode(sheetName: string, id: string, code?: string): Promise<{ rowIndex0Based: number; row: any[] } | null> {
    const rows = await this.getSheetData(sheetName, true);
    if (rows.length < 2) return null;

    const rowIndex0Based = rows.findIndex((row, idx) => {
      if (idx === 0) return false;
      return row[0] === id || (!!code && row[1] === code);
    });

    if (rowIndex0Based === -1) return null;
    return { rowIndex0Based, row: rows[rowIndex0Based] };
  }

  private async deleteRowsByIds(sheetName: string, ids: string[]): Promise<void> {
    if (!ids.length) return;
    const idSet = new Set(ids);
    const rows = await this.getSheetData(sheetName, true);
    if (rows.length < 2) return;

    // Delete bottom-to-top so row indexes do not shift underneath us.
    const indexes = rows
      .map((row, idx) => ({ row, idx }))
      .filter(({ idx, row }) => idx > 0 && idSet.has(String(row[0])))
      .map(({ idx }) => idx)
      .sort((a, b) => b - a);

    for (const rowIndex0Based of indexes) {
      await this.deleteRow(sheetName, rowIndex0Based);
    }
  }

  public async getRecipes(): Promise<any[]> {
    const rows = await this.getSheetData('recipes', true);
    if (rows.length < 2) return [];

    const headers = rows[0];
    const recipes = rows.slice(1)
      .filter(row => row.length > 0 && row[0])
      .map(row => {
        const item: any = {};
        headers.forEach((header: string, index: number) => {
          item[header] = row[index] ?? '';
        });

        item.yield_quantity = Number(item.yield_quantity) || 0;
        item.prep_time = Number(item.prep_time) || 0;
        item.cook_time = Number(item.cook_time) || 0;
        item.total_ingredient_cost = Number(item.total_ingredient_cost) || 0;
        item.hpp_per_portion = Number(item.hpp_per_portion) || 0;
        item.target_food_cost_pct = Number(item.target_food_cost_pct) || 0;
        item.selling_price = Number(item.selling_price) || 0;
        item.food_cost_pct = Number(item.food_cost_pct) || 0;
        item.gross_profit = Number(item.gross_profit) || 0;
        item.margin_pct = Number(item.margin_pct) || 0;
        return item;
      });

    // Restore recipe ingredients from the child sheet.
    try {
      const ingredientRows = await this.getSheetData('recipe_ingredients', true);
      const versionsRows = await this.getSheetData('recipe_versions', true);

      const ingredientHeaders = ingredientRows[0] || [];
      const versionHeaders = versionsRows[0] || [];

      const ingredientsByRecipe = new Map<string, any[]>();
      for (const row of ingredientRows.slice(1)) {
        if (!row[0] || !row[1]) continue;
        const item: any = {};
        ingredientHeaders.forEach((header: string, index: number) => {
          item[header] = row[index] ?? '';
        });
        item.quantity = Number(item.quantity) || 0;
        item.cost = Number(item.cost) || 0;
        item.unit_price = Number(item.unit_price) || 0;
        const list = ingredientsByRecipe.get(String(item.recipe_id)) || [];
        list.push(item);
        ingredientsByRecipe.set(String(item.recipe_id), list);
      }

      const versionsByRecipe = new Map<string, any[]>();
      for (const row of versionsRows.slice(1)) {
        if (!row[0] || !row[1]) continue;
        const item: any = {};
        versionHeaders.forEach((header: string, index: number) => {
          item[header] = row[index] ?? '';
        });
        item.version_number = Number(item.version_number) || 0;
        item.hpp = Number(item.hpp) || 0;
        item.hpp_per_portion = Number(item.hpp_per_portion) || 0;
        const list = versionsByRecipe.get(String(item.recipe_id)) || [];
        list.push(item);
        versionsByRecipe.set(String(item.recipe_id), list);
      }

      for (const recipe of recipes) {
        recipe.ingredients = ingredientsByRecipe.get(String(recipe.id)) || [];
        recipe.versions = versionsByRecipe.get(String(recipe.id)) || [];
      }
    } catch (err: any) {
      // The main recipe row is still usable even if optional child-sheet
      // hydration fails.
      console.warn('Could not hydrate recipe child data:', err?.message || err);
    }

    return recipes;
  }

  public async upsertRecipe(recipe: any): Promise<boolean> {
    if (!this.isConfigured()) throw new Error('Google Sheets is not configured');

    const row = [
      recipe.id ?? '',
      recipe.code ?? '',
      recipe.name ?? '',
      recipe.category_id ?? '',
      recipe.photo_url ?? '',
      recipe.description ?? '',
      recipe.yield_quantity ?? 0,
      recipe.yield_unit ?? '',
      recipe.prep_time ?? 0,
      recipe.cook_time ?? 0,
      recipe.instructions ?? '',
      recipe.notes ?? '',
      recipe.status ?? 'ACTIVE',
      recipe.active_version_id ?? '',
      recipe.total_ingredient_cost ?? 0,
      recipe.hpp_per_portion ?? 0,
      recipe.target_food_cost_pct ?? 0,
      recipe.selling_price ?? 0,
      recipe.food_cost_pct ?? 0,
      recipe.gross_profit ?? 0,
      recipe.margin_pct ?? 0,
      recipe.created_at ?? new Date().toISOString(),
      recipe.updated_at ?? new Date().toISOString(),
      recipe.photo_file_id ?? '',
    ];

    const existing = await this.findRowByIdOrCode('recipes', String(recipe.id), recipe.code);
    if (existing) {
      await this.updateRow('recipes', existing.rowIndex0Based + 1, row);
    } else {
      await this.appendRow('recipes', row);
    }

    // Persist recipe ingredients so HPP data can be reconstructed later.
    const oldIngredients = await this.getSheetData('recipe_ingredients', true);
    if (oldIngredients.length > 1) {
      const oldIds = oldIngredients.slice(1)
        .filter(r => String(r[1]) === String(recipe.id) && r[0])
        .map(r => String(r[0]));
      await this.deleteRowsByIds('recipe_ingredients', oldIds);
    }

    for (const item of (recipe.ingredients || [])) {
      await this.appendRow('recipe_ingredients', [
        item.id ?? `ri_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        recipe.id ?? '',
        item.ingredient_type ?? 'INGREDIENT',
        item.ingredient_id ?? '',
        item.quantity ?? 0,
        item.unit ?? '',
        item.cost ?? 0,
        item.created_at ?? new Date().toISOString(),
      ]);
    }

    // Persist recipe version snapshots as metadata. The ingredient snapshot is
    // intentionally not stored in the current sheet schema, matching the
    // existing database template.
    const oldVersions = await this.getSheetData('recipe_versions', true);
    if (oldVersions.length > 1) {
      const oldIds = oldVersions.slice(1)
        .filter(r => String(r[1]) === String(recipe.id) && r[0])
        .map(r => String(r[0]));
      await this.deleteRowsByIds('recipe_versions', oldIds);
    }

    for (const version of (recipe.versions || [])) {
      await this.appendRow('recipe_versions', [
        version.id ?? '',
        recipe.id ?? '',
        version.version_number ?? 0,
        version.version_name ?? '',
        version.hpp ?? 0,
        version.change_notes ?? '',
        version.status ?? 'ACTIVE',
        version.created_at ?? new Date().toISOString(),
      ]);
    }

    return true;
  }

  public async deleteRecipe(recipeId: string): Promise<boolean> {
    const existing = await this.findRowByIdOrCode('recipes', recipeId);
    if (!existing) return false;

    await this.deleteRow('recipes', existing.rowIndex0Based);

    const ingredientRows = await this.getSheetData('recipe_ingredients', true);
    const ingredientIds = ingredientRows.slice(1)
      .filter(r => String(r[1]) === String(recipeId) && r[0])
      .map(r => String(r[0]));
    await this.deleteRowsByIds('recipe_ingredients', ingredientIds);

    const versionRows = await this.getSheetData('recipe_versions', true);
    const versionIds = versionRows.slice(1)
      .filter(r => String(r[1]) === String(recipeId) && r[0])
      .map(r => String(r[0]));
    await this.deleteRowsByIds('recipe_versions', versionIds);

    return true;
  }

  public async getMenus(): Promise<any[]> {
    const rows = await this.getSheetData('menus', true);
    if (rows.length < 2) return [];

    const headers = rows[0];
    return rows.slice(1)
      .filter(row => row.length > 0 && row[0])
      .map(row => {
        const item: any = {};
        headers.forEach((header: string, index: number) => {
          item[header] = row[index] ?? '';
        });
        item.selling_price = Number(item.selling_price) || 0;
        item.hpp = Number(item.hpp) || 0;
        item.food_cost = Number(item.food_cost) || 0;
        item.gross_profit = Number(item.gross_profit) || 0;
        item.margin = Number(item.margin) || 0;
        return item;
      });
  }

  public async upsertMenu(menu: any): Promise<boolean> {
    if (!this.isConfigured()) throw new Error('Google Sheets is not configured');

    const row = [
      menu.id ?? '',
      menu.code ?? '',
      menu.name ?? '',
      menu.category_id ?? '',
      menu.recipe_id ?? '',
      menu.selling_price ?? 0,
      menu.hpp ?? 0,
      menu.food_cost ?? 0,
      menu.gross_profit ?? 0,
      menu.margin ?? 0,
      menu.photo_url ?? '',
      menu.status ?? 'ACTIVE',
      menu.created_at ?? new Date().toISOString(),
      menu.updated_at ?? new Date().toISOString(),
      menu.photo_file_id ?? '',
    ];

    const existing = await this.findRowByIdOrCode('menus', String(menu.id), menu.code);
    if (existing) {
      await this.updateRow('menus', existing.rowIndex0Based + 1, row);
    } else {
      await this.appendRow('menus', row);
    }

    return true;
  }

  public async deleteMenu(menuId: string): Promise<boolean> {
    const existing = await this.findRowByIdOrCode('menus', menuId);
    if (!existing) return false;
    await this.deleteRow('menus', existing.rowIndex0Based);
    return true;
  }

  public async updateMenuPhotoInSheet(menuId: string, photoUrl: string, photoFileId: string): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const rows = await this.getSheetData('menus', true);
      if (rows.length < 2) return false;
      const headerRow = rows[0];
      const photoUrlColIdx = headerRow.indexOf('photo_url');
      const photoFileIdColIdx = headerRow.indexOf('photo_file_id');

      const rowIndex0Based = rows.findIndex((r, idx) => idx > 0 && (r[0] === menuId || r[1] === menuId));
      if (rowIndex0Based === -1) return false;

      const targetRow = [...rows[rowIndex0Based]];
      if (photoUrlColIdx !== -1) {
        targetRow[photoUrlColIdx] = photoUrl;
      }
      if (photoFileIdColIdx !== -1) {
        targetRow[photoFileIdColIdx] = photoFileId;
      } else {
        targetRow.push(photoFileId);
      }

      await this.updateRow('menus', rowIndex0Based + 1, targetRow);
      return true;
    } catch (err: any) {
      console.warn('Could not sync menu photo to Google Sheets:', err.message);
      return false;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
