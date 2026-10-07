import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Save,
  Activity,
  Key,
  ExternalLink,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { AppSettings, AuditLog } from '../../types';
import { formatDateTime } from '../../lib/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SettingsViewProps {
  settings: AppSettings;
  auditLogs: AuditLog[];
  onUpdateSettings: (data: Partial<AppSettings>) => Promise<void>;
  onResetDatabase: () => Promise<void>;
  onTestSheetsConnection: () => Promise<{ success: boolean; message: string; sheetCount?: number; title?: string }>;
  onInitializeSheets: () => Promise<void>;
  isLoading: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  auditLogs,
  onUpdateSettings,
  onResetDatabase,
  onTestSheetsConnection,
  onInitializeSheets,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    app_name: settings.app_name,
    food_cost_target: settings.food_cost_target,
    margin_target: settings.margin_target,
    food_cost_threshold_low: settings.food_cost_threshold_low,
    food_cost_threshold_high: settings.food_cost_threshold_high,
    price_rounding: settings.price_rounding,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isTestingSheets, setIsTestingSheets] = useState(false);
  const [sheetsTestResult, setSheetsTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isInitializingSheets, setIsInitializingSheets] = useState(false);
  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState<{ success: boolean; message: string; folderName?: string } | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  const handleTestDrive = async () => {
    setIsTestingDrive(true);
    setDriveTestResult(null);
    try {
      const res = await fetch('/api/drive/test-connection', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data) {
        setDriveTestResult(data.data);
      } else {
        setDriveTestResult({
          success: false,
          message: data.message || 'Gagal menguji koneksi Google Drive.',
        });
      }
    } catch (err: any) {
      setDriveTestResult({
        success: false,
        message: err.message || 'Gagal menghubungi server.',
      });
    } finally {
      setIsTestingDrive(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg(false);
    try {
      await onUpdateSettings({
        ...formData,
        food_cost_target: Number(formData.food_cost_target),
        margin_target: Number(formData.margin_target),
        food_cost_threshold_low: Number(formData.food_cost_threshold_low),
        food_cost_threshold_high: Number(formData.food_cost_threshold_high),
      });
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingSheets(true);
    setSheetsTestResult(null);
    try {
      const res = await onTestSheetsConnection();
      setSheetsTestResult(res);
    } catch (err: any) {
      setSheetsTestResult({
        success: false,
        message: err.message || 'Gagal terhubung ke Google Sheets API.',
      });
    } finally {
      setIsTestingSheets(false);
    }
  };

  const handleInitSheets = async () => {
    if (!confirm('Inisialisasi 12 sheet database standar pada spreadsheet Google Sheets Anda?')) return;
    setIsInitializingSheets(true);
    try {
      await onInitializeSheets();
      alert('12 Sheet CULINOVA berhasil diinisialisasi.');
    } catch (err: any) {
      alert(err.message || 'Gagal inisialisasi sheet.');
    } finally {
      setIsInitializingSheets(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-3 border-b border-stone-200/60">
        <h2 className="font-display text-xl lg:text-[22px] font-bold tracking-tight text-[#2B2118]">
          Pengaturan Sistem & Database (Settings)
        </h2>
        <p className="text-xs text-[#735A47] mt-0.5">
          Konfigurasi target biaya kuliner, pembulatan harga, koneksi Google Sheets, dan rekam audit log.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="glass-solid p-6 rounded-[28px] space-y-5 text-xs shadow-xs border border-white/70">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/60">
              <h3 className="font-display text-sm font-bold text-[#2B2118] flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-[#D9482B]" />
                <span>Parameter Food Cost & Pricing</span>
              </h3>
              {saveSuccessMsg && (
                <span className="text-xs font-semibold badge-safe px-2.5 py-1 rounded-full">
                  Pengaturan berhasil disimpan!
                </span>
              )}
            </div>

            <div>
              <label className="block font-semibold text-[#2B2118] mb-1">Nama Aplikasi</label>
              <input
                type="text"
                value={formData.app_name}
                onChange={e => setFormData({ ...formData, app_name: e.target.value })}
                className="input-pill"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#2B2118] mb-1">
                  Target Food Cost Acuan (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    required
                    value={formData.food_cost_target}
                    onChange={e => setFormData({ ...formData, food_cost_target: Number(e.target.value) })}
                    className="input-pill pr-8 font-mono"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6B] font-medium">%</span>
                </div>
                <p className="text-[11px] text-[#735A47] mt-1">Standar industri restoran: 30% - 35%.</p>
              </div>

              <div>
                <label className="block font-semibold text-[#2B2118] mb-1">
                  Target Gross Margin Acuan (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    required
                    value={formData.margin_target}
                    onChange={e => setFormData({ ...formData, margin_target: Number(e.target.value) })}
                    className="input-pill pr-8 font-mono"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6B] font-medium">%</span>
                </div>
                <p className="text-[11px] text-[#735A47] mt-1">Standar margin kotor: 65% - 70%.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#2B2118] mb-1">
                  Batas Ambang Food Cost Rendah (Low %)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formData.food_cost_threshold_low}
                    onChange={e => setFormData({ ...formData, food_cost_threshold_low: Number(e.target.value) })}
                    className="input-pill pr-8 font-mono"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6B] font-medium">%</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2B2118] mb-1">
                  Batas Ambang Food Cost Tinggi (High %)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formData.food_cost_threshold_high}
                    onChange={e => setFormData({ ...formData, food_cost_threshold_high: Number(e.target.value) })}
                    className="input-pill pr-8 font-mono"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6B] font-medium">%</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#2B2118] mb-1">
                Aturan Pembulatan Harga Jual (Price Rounding)
              </label>
              <select
                value={formData.price_rounding}
                onChange={e => setFormData({ ...formData, price_rounding: e.target.value as any })}
                className="input-pill cursor-pointer"
              >
                <option value="500">Pembulatan ke Kelipatan Rp500 Terdekat (Nearest 500)</option>
                <option value="1000">Pembulatan ke Kelipatan Rp1.000 Terdekat (Nearest 1.000)</option>
                <option value="NONE">Tanpa Pembulatan (Nilai Persis Matematis)</option>
              </select>
            </div>

            <div className="pt-3 border-t border-stone-200/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-[#D9482B] hover:text-[#C23C21] font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Database ke Data Demo</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="btn-pill-primary inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Google Sheets Integration Status */}
        <div className="space-y-6">
          <div className="glass-solid p-6 rounded-[28px] space-y-4 text-xs shadow-xs border border-white/70">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/60">
              <h3 className="font-display text-sm font-bold text-[#2B2118] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#D9482B]" />
                <span>Google Sheets Database</span>
              </h3>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-medium ${
                settings.google_is_connected ? 'badge-safe' : 'badge-warn'
              }`}>
                {settings.google_is_connected ? 'Live Connected' : 'Ready / Fallback'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-[#735A47] font-medium">Spreadsheet ID Terdaftar:</div>
              <div className="p-2.5 bg-white/70 border border-stone-200/60 rounded-[14px] font-mono text-[11px] truncate text-[#2B2118] shadow-2xs">
                {settings.google_sheet_id || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms (Demo)'}
              </div>

              <div className="text-[#735A47] font-medium pt-1">Service Account Email:</div>
              <div className="p-2.5 bg-white/70 border border-stone-200/60 rounded-[14px] font-mono text-[11px] truncate text-[#2B2118] shadow-2xs">
                {settings.google_client_email || 'culinova-service@culinova-food-cost.iam.gserviceaccount.com'}
              </div>
            </div>

            {sheetsTestResult && (
              <div
                className={`p-3 rounded-[16px] border flex items-start gap-2.5 ${
                  sheetsTestResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-[#285A1D]'
                    : 'bg-amber-500/10 border-amber-500/20 text-[#A66E0A]'
                }`}
              >
                {sheetsTestResult.success ? (
                  <CheckCircle className="w-4 h-4 text-[#285A1D] shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#A66E0A] shrink-0 mt-0.5" />
                )}
                <div className="leading-snug font-medium">{sheetsTestResult.message}</div>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingSheets}
                className="btn-pill-secondary w-full py-2.5 flex items-center justify-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5 text-[#735A47]" />
                <span>{isTestingSheets ? 'Menguji Koneksi...' : 'Uji Koneksi Google Sheets'}</span>
              </button>

              <button
                type="button"
                onClick={handleInitSheets}
                disabled={isInitializingSheets}
                className="btn-pill-primary w-full py-2.5 flex items-center justify-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{isInitializingSheets ? 'Menginisialisasi...' : 'Inisialisasi 12 Tabel Sheet'}</span>
              </button>
            </div>
          </div>

          {/* Google Drive Storage (CULINOVA_IMAGES) Status */}
          <div className="glass-solid p-6 rounded-[28px] space-y-4 text-xs shadow-xs border border-white/70">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/60">
              <h3 className="font-display text-sm font-bold text-[#2B2118] flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#D9482B]" />
                <span>Google Drive Storage</span>
              </h3>
              <span className="badge-safe inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-medium">
                Folder CULINOVA_IMAGES
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-[#735A47] font-medium">Dedikasi Folder Penyimpanan:</div>
              <div className="p-2.5 bg-white/70 border border-stone-200/60 rounded-[14px] font-mono text-[11px] truncate text-[#2B2118] shadow-2xs">
                CULINOVA_IMAGES (GOOGLE_DRIVE_FOLDER_ID)
              </div>

              <div className="text-[#735A47] font-medium pt-1">Aturan Izin Akses Foto:</div>
              <div className="p-2.5 bg-white/70 border border-stone-200/60 rounded-[14px] text-[11px] text-[#5A4838] leading-relaxed shadow-2xs">
                File foto otomatis diatur <strong>Anyone with the link &rarr; Viewer</strong>. Folder utama tetap privat. URL foto tersimpan di Google Sheets.
              </div>
            </div>

            {driveTestResult && (
              <div
                className={`p-3 rounded-[16px] border flex items-start gap-2.5 ${
                  driveTestResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-[#285A1D]'
                    : 'bg-amber-500/10 border-amber-500/20 text-[#A66E0A]'
                }`}
              >
                {driveTestResult.success ? (
                  <CheckCircle className="w-4 h-4 text-[#285A1D] shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#A66E0A] shrink-0 mt-0.5" />
                )}
                <div className="leading-snug font-medium">{driveTestResult.message}</div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestDrive}
                disabled={isTestingDrive}
                className="btn-pill-secondary w-full py-2.5 flex items-center justify-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5 text-[#735A47]" />
                <span>{isTestingDrive ? 'Menguji Google Drive...' : 'Uji Koneksi Google Drive'}</span>
              </button>
            </div>
          </div>

          {/* Quick Guidance Box */}
          <div className="glass-solid p-5 rounded-[28px] text-xs space-y-2 shadow-xs border border-white/70">
            <div className="font-semibold text-[#2B2118] flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#D9482B]/10 text-[#D9482B] flex items-center justify-center">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <span>Keamanan Lingkungan Serverless</span>
            </div>
            <p className="text-[#735A47] leading-relaxed pl-9">
              Kredensial Service Account dan Google Sheet ID tersimpan aman di environment variable server (tidak terekspos ke client-side JavaScript).
            </p>
          </div>
        </div>
      </div>

      {/* Audit Logs Table (Section 46) */}
      <div className="glass-solid rounded-[28px] overflow-hidden space-y-0 shadow-xs border border-white/70">
        <div className="p-5 flex items-center justify-between border-b border-stone-200/60 bg-white/40">
          <div>
            <h3 className="font-display text-sm font-bold text-[#2B2118]">Audit Logs Aktivitas Sistem</h3>
            <p className="text-xs text-[#735A47] mt-0.5">
              Riwayat pencatatan perubahan resep, kenaikan harga bahan, dan aktivasi versi.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-[#735A47] bg-white/80 px-2.5 py-1 rounded-full border border-white/90 shadow-2xs">
            {auditLogs.length} Total Logs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200/60 bg-white/50 backdrop-blur-md text-[#735A47] font-semibold text-[10.5px] uppercase tracking-wider">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Modul</th>
                <th className="py-2.5 px-4">Aksi</th>
                <th className="py-2.5 px-4">Deskripsi Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100/80">
              {auditLogs.slice(0, 15).map(log => (
                <tr key={log.id} className="hover:bg-white/60 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-[#735A47] whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-[#2B2118]">{log.user}</td>
                  <td className="py-2.5 px-4 text-[#735A47]">{log.module}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2.5 py-0.5 font-mono text-[10px] bg-stone-100 rounded-full font-medium text-[#735A47] border border-stone-200/60">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-[#5A4838]">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Database Confirmation Modal */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={async () => {
          await onResetDatabase();
          setIsResetConfirmOpen(false);
        }}
        title="Reset Seluruh Database?"
        message="Tindakan ini akan mengembalikan seluruh data resep, bahan baku, sub-resep, dan menu ke data bawaan standar Culinova (Ayam Geprek, Nasi Goreng, Mie Ayam, Sambal Bawang, Chocolate Cake)."
        confirmText="Reset Database Sekarang"
        cancelText="Batal"
        isDestructive={true}
      />
    </div>
  );
};
