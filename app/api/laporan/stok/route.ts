import { NextResponse } from 'next/server';
import { doc, loadSpreadsheet } from '../../../../lib/googleSheets';

export async function GET() {
  try {
    // 1. Load Spreadsheet
    await loadSpreadsheet();
    const sheetProduk = doc.sheetsByTitle['produk'];

    if (!sheetProduk) {
      throw new Error("Sheet 'produk' tidak ditemukan!");
    }

    // 2. Ambil semua baris data produk
    const rows = await sheetProduk.getRows();

    // 3. Format Data untuk Frontend
    const dataProduk = rows.map((row) => {
      // PERBAIKAN DI SINI:
      // Coba ambil 'stok' (Indo), jika tidak ada coba 'stock' (Inggris), jika tidak ada return '0'
      const rawStock = row.get('stok') || row.get('stock') || '0';
      
      // Coba ambil 'departemen' atau 'department_id'
      const rawDept = row.get('departemen') || row.get('department_id') || '-';

      return {
        id: row.get('id'), 
        kode_qr: row.get('kode_qr'),
        nama_produk: row.get('nama_produk'),
        stok_saat_ini: parseInt(rawStock, 10), // Parsing angka yang benar
        departemen: rawDept
      };
    });

    return NextResponse.json({ 
        success: true, 
        data: dataProduk 
    });

  } catch (error: any) {
    console.error("Error API Stok:", error);
    return NextResponse.json(
      { message: 'Gagal memuat data produk', error: error.message },
      { status: 500 }
    );
  }
}