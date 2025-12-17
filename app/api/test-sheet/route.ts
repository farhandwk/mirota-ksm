import { NextResponse } from 'next/server';
import { loadSpreadsheet, SHEET_TITLES } from '../../../lib/googleSheets';

export async function GET() {
  try {
    console.log("=== MEMULAI TEST KONEKSI GOOGLE SHEET ===");
    
    // 1. Cek Environment Variables
    if (!process.env.GOOGLE_PRIVATE_KEY) throw new Error("GOOGLE_PRIVATE_KEY tidak terbaca di .env");
    if (!process.env.GOOGLE_SHEET_ID) throw new Error("GOOGLE_SHEET_ID tidak terbaca di .env");

    // 2. Coba Load Spreadsheet
    console.log("Mencoba loadSpreadsheet()...");
    const doc = await loadSpreadsheet();
    console.log("Judul Spreadsheet:", doc.title);

    // 3. Cek Sheet Users
    const sheet = doc.sheetsByTitle[SHEET_TITLES.USERS];
    if (!sheet) throw new Error(`Sheet '${SHEET_TITLES.USERS}' tidak ditemukan! Pastikan nama tab di Google Sheet benar.`);

    // 4. Coba Baca Data
    const rows = await sheet.getRows();
    console.log(`Berhasil membaca ${rows.length} baris user.`);

    return NextResponse.json({ 
      status: 'SUKSES', 
      message: 'Koneksi Google Sheet Berhasil!',
      docTitle: doc.title,
      userCount: rows.length,
      users: rows.map(r => r.get('username')) // Tampilkan username yg terbaca
    });

  } catch (error: any) {
    console.error("=== TEST GAGAL ===");
    console.error(error);
    
    // Tampilkan error detail ke browser
    return NextResponse.json({ 
      status: 'GAGAL', 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}