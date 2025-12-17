import { NextResponse } from 'next/server';
import { loadSpreadsheet, SHEET_TITLES } from '../../../lib/googleSheets';
import { productSchema } from '../../../lib/validators';
import { v4 as uuidv4 } from 'uuid';

// 1. FUNGSI GET (Untuk Mengambil Data ke Tabel)
export async function GET() {
  try {
    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.PRODUCTS];
    const rows = await sheet.getRows();

    // Mapping data
    const products = rows.map((row) => ({
      id: row.get('id'),
      qr_code: row.get('kode_qr'),
      name: row.get('nama_produk'),
      department_id: row.get('id_departemen'),
      stock: parseInt(row.get('stok') || '0'), // Perhatikan nama header 'stok' harus sama dgn spreadsheet
      unit: row.get('satuan'),
    }));

    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. FUNGSI POST (Untuk Tambah Barang Baru)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = productSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.flatten() }, { status: 400 });
    }

    const { nama_produk, id_departemen, satuan } = validation.data;
    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.PRODUCTS];

    const newId = uuidv4(); 
    // Logic QR: ID_DEPT + 4 Huruf Random + Detik
    const timestampCode = Math.floor(Date.now() / 1000).toString().slice(-4);
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    const generatedQR = `${id_departemen}-${randomStr}-${timestampCode}`;
    const now = new Date().toISOString();

    await sheet.addRow({
      id: newId,
      kode_qr: generatedQR,
      nama_produk: nama_produk,
      id_departemen: id_departemen,
      stok: 0,
      satuan: satuan,
      updated_at: now
    });

    return NextResponse.json({ success: true, message: "Sukses!" });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Gagal Server" }, { status: 500 });
  }
}