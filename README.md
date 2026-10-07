# CULINOVA — Recipe & Food Cost Management System
> **"Know Your Recipe. Know Your Cost."**  
> Proyek Informatika Kelas XII — Modern Culinary Intelligence & SaaS Food Cost Platform

---

## 📋 Deskripsi Aplikasi

**CULINOVA** adalah sistem manajemen resep dan kalkulasi HPP (*Harga Pokok Penjualan*) berbasis cloud untuk industri kuliner, restoran, kafe, dan bakery modern. Aplikasi ini menghubungkan antarmuka web modern dengan **Google Sheets API** sebagai basis data terstruktur, aman, dan mudah diakses oleh pemilik usaha tanpa biaya lisensi database yang mahal.

### Fitur Utama:
1. **Master Bahan Baku**: Konversi harga otomatis ke satuan terkecil (*Base Unit* seperti Kg ke Gram, Liter ke Ml).
2. **Bank Resep & HPP Otomatis**: Menghitung Total Ingredient Cost, HPP per Batch, dan HPP per Porsi secara presisi.
3. **Food Cost & Margin Calculator**: Penetapan harga jual berdasarkan target Food Cost %, rekomendasi rounding (tanpa pembulatan, kelipatan 500, atau 1.000).
4. **Sub-Recipe Engine**: Pengelolaan resep pendukung (misal sambal, saus, adonan dasar) yang dapat digunakan pada banyak menu utama dengan perlindungan deteksi *Circular Dependency*.
5. **Riwayat Perubahan Harga & Cost Alerts**: Notifikasi kenaikan harga bahan baku dan estimasi dampak perubahan HPP resep terkait secara real-time.
6. **Recipe Versioning & Compare**: Penyimpanan rekam jejak versi resep (v1, v2, dst.) dan perbandingan perubahan gramasi serta HPP.
7. **Menu Jual (Sales Menu)**: Memisahkan konsep resep dapur dengan menu jual kasir / POS.
8. **Visual Analytics & Laporan**: Dashboard metrik, distribusi Food Cost, Margin, serta ekspor PDF dan CSV yang siap cetak.
9. **Koneksi Google Sheets API**: Dapat berjalan langsung dengan local demo data atau terhubung sinkron ke Google Spreadsheet live menggunakan Service Account.

---

## 🛠️ Panduan Integrasi Google Sheets API

Ikuti 8 langkah praktis berikut untuk menghubungkan CULINOVA ke Google Spreadsheet Anda:

### 1. Buat Google Cloud Project
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Klik dropdown project di bagian atas lalu klik **New Project**.
3. Beri nama project, misalnya `Culinova-Food-Cost`, lalu klik **Create**.

### 2. Aktifkan Google Sheets API
1. Pada menu navigasi kiri Google Cloud Console, pilih **APIs & Services > Library**.
2. Cari **"Google Sheets API"**.
3. Klik **Google Sheets API** kemudian klik tombol **Enable**.

### 3. Buat Service Account & Unduh Key JSON
1. Masuk ke **APIs & Services > Credentials**.
2. Klik **Create Credentials > Service Account**.
3. Masukkan nama: `culinova-sheets-service` lalu klik **Create and Continue**.
4. Pada pemilihan role, pilih **Editor** atau **Basic > Editor**, klik **Done**.
5. Klik pada Service Account yang baru dibuat, buka tab **Keys**.
6. Klik **Add Key > Create New Key > JSON**, lalu unduh file JSON tersebut.
7. Buka file JSON dengan text editor untuk melihat:
   - `client_email`
   - `private_key`
   - `project_id`

### 4. Buat Google Spreadsheet & Bagikan Akses
1. Buat spreadsheet baru di [Google Sheets](https://sheets.new).
2. Beri nama spreadsheet: `CULINOVA_DB`.
3. Klik tombol **Share (Bagikan)** di pojok kanan atas.
4. Paste alamat email Service Account (misalnya `culinova-sheets-service@...iam.gserviceaccount.com`).
5. Pastikan perannya adalah **Editor**, uncheck "Notify people", lalu klik **Share**.

### 5. Dapatkan Spreadsheet ID
Ambil ID dari URL browser Google Sheets Anda:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
                                       └──────────────────┬──────────────────┘
                                                    Spreadsheet ID
```

### 6. Konfigurasi Environment Variables
Buat file `.env` di direktori root aplikasi (atau tambahkan di dashboard Vercel):

```env
GOOGLE_PROJECT_ID="nama-project-anda"
GOOGLE_CLIENT_EMAIL="culinova-sheets-service@project-id.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQE...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"

ADMIN_USERNAME="admin"
ADMIN_PASSWORD="culinova2026"
```
*(Catatan: Karakter `\n` pada private key harus tetap dipertahankan)*

### 7. Menjalankan Project Secara Lokal
```bash
# Install seluruh dependencies
npm install

# Jalankan server pengembangan (port 3000)
npm run dev
```
Buka browser pada `http://localhost:3000`.

### 8. Deploy ke Vercel
1. Push project ini ke repository GitHub pribadi Anda.
2. Buka dashboard [Vercel](https://vercel.com/) dan pilih **Add New > Project**.
3. Import repository CULINOVA.
4. Masukkan seluruh variabel lingkungan di atas ke bagian **Environment Variables** Vercel.
5. Klik **Deploy**. Vercel akan otomatis mengeksekusi routing `vercel.json` dan API serverless.

---

## ⚡ Inisialisasi Otomatis Google Sheets
Aplikasi CULINOVA dilengkapi tombol **"Inisialisasi Tabel Google Sheets"** pada menu **Settings**.  
Sistem akan otomatis membuat 12 sheets beserta header kolom baku sesuai standar sistem:
- `ingredients`
- `categories`
- `units`
- `recipes`
- `recipe_ingredients`
- `sub_recipes`
- `sub_recipe_ingredients`
- `menus`
- `ingredient_price_history`
- `recipe_versions`
- `settings`
- `audit_logs`

---

## 👨‍🍳 Kredensial Demo
- **Username**: `admin`
- **Password**: `culinova2026`
