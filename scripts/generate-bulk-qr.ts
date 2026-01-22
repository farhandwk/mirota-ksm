import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import QRCode from 'qrcode';
import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// --- KONFIGURASI ---
// 1. Cek nama Tab di bawah Spreadsheet Anda (misal: "Sheet1", "products", atau "Data Barang")
// GANTI 'products' DENGAN NAMA TAB ASLI ANDA!
const NAMA_SHEET_PRODUK = 'produk'; 

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n');

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function generateAndUploadQR(qrText: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(qrText, { width: 300, margin: 2 });
    const uploadResult = await cloudinary.uploader.upload(dataUrl, {
      folder: 'product-qrcodes',
      public_id: `qr_${qrText.replace(/[^a-zA-Z0-9]/g, '_')}`, // Sanitize nama file
      overwrite: true,
      resource_type: 'image',
    });
    return uploadResult.secure_url;
  } catch (error) {
    console.error(`Gagal memproses QR untuk ${qrText}:`, error);
    throw error;
  }
}

async function runBulkUpdate() {
  console.log('🔄 Menghubungkan ke Google Spreadsheet...');

  const serviceAccountAuth = new JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);

  try {
    await doc.loadInfo();

    // --- BAGIAN PERBAIKAN ---
    console.log('📑 Daftar Sheet yang tersedia:');
    doc.sheetsByIndex.forEach(s => console.log(`   - [${s.index}] ${s.title} (${s.rowCount} baris)`));

    // Mengambil sheet berdasarkan NAMA, bukan Index
    const sheet = doc.sheetsByTitle[NAMA_SHEET_PRODUK];

    if (!sheet) {
      console.error(`\n❌ ERROR FATAL: Sheet dengan nama "${NAMA_SHEET_PRODUK}" tidak ditemukan!`);
      console.error(`👉 Silakan ganti variabel 'NAMA_SHEET_PRODUK' di baris 12 script ini dengan salah satu nama dari daftar di atas.\n`);
      return;
    }
    // -------------------------

    console.log(`\n🚀 Sedang memproses sheet: "${sheet.title}"...`);
    const rows = await sheet.getRows();
    console.log(`📊 Total data: ${rows.length} baris.`);

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      const kodeQR = row.get('kode_qr'); 
      const existingImage = row.get('gambar_qr');

      // Logika Pengecekan
      if (kodeQR && (!existingImage || existingImage === '')) {
        console.log(`⚡ Generating: ${kodeQR} (${row.get('nama_produk') || 'Tanpa Nama'})...`);

        try {
          const imageUrl = await generateAndUploadQR(kodeQR);
          
          row.set('gambar_qr', imageUrl);
          await row.save(); 

          console.log(`   ✅ Tersimpan: ${imageUrl}`);
          processedCount++;
        } catch (err) {
          console.error(`   ❌ Gagal row ${row.rowNumber}:`, err);
          errorCount++;
        }
      } else {
        skippedCount++;
        // Uncomment untuk debug baris yang dilewati
        // console.log(`   ⏩ Skip: ${kodeQR} (Sudah ada gambar/Kode kosong)`);
      }
    }

    console.log('\n=============================');
    console.log('🎉 Bulk Update Selesai!');
    console.log(`✅ Berhasil Generate: ${processedCount}`);
    console.log(`⏩ Dilewati (Sudah ada): ${skippedCount}`);
    console.log(`❌ Gagal: ${errorCount}`);
    console.log('=============================');

  } catch (error) {
    console.error('FATAL ERROR:', error);
  }
}

runBulkUpdate();