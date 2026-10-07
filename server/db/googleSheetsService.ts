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
