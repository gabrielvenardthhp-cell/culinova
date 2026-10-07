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

  private async findRowIndex(sheetName: string, id: string): Promise<number> {
    const rows = await this.getSheetData(sheetName, true);
    if (rows.length < 2) return -1;
    return rows.findIndex((row, idx) => idx > 0 && String(row[0] || '') === String(id));
  }

  private async deleteRowsMatchingId(sheetName: string, id: string, idColumnIndex = 0): Promise<void> {
    const rows = await this.getSheetData(sheetName, true);
    if (rows.length < 2) return;
    const indexes: number[] = [];
    rows.forEach((row, idx) => { if (idx > 0 && String(row[idColumnIndex] || '') === String(id)) indexes.push(idx); });
    for (let i = indexes.length - 1; i >= 0; i--) await this.deleteRow(sheetName, indexes[i]);
  }

  private recipeToRow(recipe: any): any[] {
    return [recipe.id, recipe.code, recipe.name, recipe.category_id, recipe.photo_url || '', recipe.description || '', recipe.yield_quantity ?? 1, recipe.yield_unit || 'Portion', recipe.prep_time ?? 0, recipe.cook_time ?? 0, recipe.instructions || '', recipe.notes || '', recipe.status || 'ACTIVE', recipe.active_version_id || '', recipe.total_ingredient_cost ?? 0, recipe.hpp_per_portion ?? 0, recipe.target_food_cost_pct ?? 35, recipe.selling_price ?? 0, recipe.food_cost_pct ?? 0, recipe.gross_profit ?? 0, recipe.margin_pct ?? 0, recipe.created_at || new Date().toISOString(), recipe.updated_at || new Date().toISOString(), recipe.photo_file_id || ''];
  }

  private recipeIngredientToRow(item: any): any[] {
    return [item.id, item.recipe_id, item.ingredient_type || 'INGREDIENT', item.ingredient_id, item.quantity ?? 0, item.unit || 'Gram', item.cost ?? 0, item.created_at || new Date().toISOString()];
  }

  private recipeVersionToRow(version: any): any[] {
    return [version.id, version.recipe_id, version.version_number ?? 1, version.version_name || '', version.hpp ?? 0, version.change_notes || '', version.status || 'ACTIVE', version.created_at || new Date().toISOString()];
  }

  public async upsertRecipe(recipe: any): Promise<boolean> {
    if (!this.isConfigured()) return false;
    const existingIndex = await this.findRowIndex('recipes', recipe.id);
    const row = this.recipeToRow(recipe);
    if (existingIndex === -1) await this.appendRow('recipes', row); else await this.updateRow('recipes', existingIndex + 1, row);
    await this.deleteRowsMatchingId('recipe_ingredients', recipe.id, 1);
    for (const item of recipe.ingredients || []) await this.appendRow('recipe_ingredients', this.recipeIngredientToRow(item));
    await this.deleteRowsMatchingId('recipe_versions', recipe.id, 1);
    for (const version of recipe.versions || []) await this.appendRow('recipe_versions', this.recipeVersionToRow(version));
    return true;
  }

  public async deleteRecipe(recipeId: string): Promise<boolean> {
    if (!this.isConfigured()) return false;
    const idx = await this.findRowIndex('recipes', recipeId);
    if (idx !== -1) await this.deleteRow('recipes', idx);
    await this.deleteRowsMatchingId('recipe_ingredients', recipeId, 1);
    await this.deleteRowsMatchingId('recipe_versions', recipeId, 1);
    return true;
  }

  public async getRecipes(): Promise<any[]> {
    if (!this.isConfigured()) return [];
    const rows = await this.getSheetData('recipes', true);
    if (rows.length < 2) return [];
    const headers = rows[0];
    const recipes = rows.slice(1).filter(r => r[0]).map(r => {
      const o: any = {}; headers.forEach((h, i) => { o[h] = r[i] ?? ''; });
      ['yield_quantity','prep_time','cook_time','total_ingredient_cost','hpp_per_portion','target_food_cost_pct','selling_price','food_cost_pct','gross_profit','margin_pct'].forEach(k => o[k] = Number(o[k] || 0));
      o.ingredients = []; o.versions = []; return o;
    });
    const ir = await this.getSheetData('recipe_ingredients', true);
    if (ir.length > 1) for (const r of ir.slice(1)) {
      if (!r[0] || !r[1]) continue; const x:any={}; ir[0].forEach((h,i)=>x[h]=r[i]??''); x.quantity=Number(x.quantity||0); x.cost=Number(x.cost||0);
      const rec=recipes.find(x2=>String(x2.id)===String(x.recipe_id)); if(rec) rec.ingredients.push(x);
    }
    const vr = await this.getSheetData('recipe_versions', true);
    if (vr.length > 1) for (const r of vr.slice(1)) {
      if (!r[0] || !r[1]) continue; const x:any={}; vr[0].forEach((h,i)=>x[h]=r[i]??''); x.version_number=Number(x.version_number||1); x.hpp=Number(x.hpp||0);
      const rec=recipes.find(x2=>String(x2.id)===String(x.recipe_id)); if(rec) rec.versions.push(x);
    }
    return recipes;
  }

  private menuToRow(menu: any): any[] {
    return [menu.id, menu.code, menu.name, menu.category_id, menu.recipe_id, menu.selling_price ?? 0, menu.hpp ?? 0, menu.food_cost ?? 0, menu.gross_profit ?? 0, menu.margin ?? 0, menu.photo_url || '', menu.status || 'ACTIVE', menu.created_at || new Date().toISOString(), menu.updated_at || new Date().toISOString(), menu.photo_file_id || ''];
  }

  public async upsertMenu(menu: any): Promise<boolean> {
    if (!this.isConfigured()) return false;
    const idx = await this.findRowIndex('menus', menu.id); const row=this.menuToRow(menu);
    if (idx === -1) await this.appendRow('menus', row); else await this.updateRow('menus', idx + 1, row);
    return true;
  }

  public async deleteMenu(menuId: string): Promise<boolean> {
    if (!this.isConfigured()) return false; const idx=await this.findRowIndex('menus', menuId); if(idx!==-1) await this.deleteRow('menus',idx); return true;
  }

  public async getMenus(): Promise<any[]> {
    if (!this.isConfigured()) return []; const rows=await this.getSheetData('menus',true); if(rows.length<2) return [];
    const h=rows[0]; return rows.slice(1).filter(r=>r[0]).map(r=>{const o:any={}; h.forEach((k,i)=>o[k]=r[i]??''); ['selling_price','hpp','food_cost','gross_profit','margin'].forEach(k=>o[k]=Number(o[k]||0)); return o;});
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
