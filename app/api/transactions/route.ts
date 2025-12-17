import { NextResponse } from 'next/server';
import { loadSpreadsheet, SHEET_TITLES } from '../../../lib/googleSheets';
import { transactionSchema } from '../../../lib/validators';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const doc = await loadSpreadsheet();
    // Pastikan nama sheet ini sesuai dengan konstanta SHEET_TITLES.TRANSACTIONS anda
    const sheet = doc.sheetsByTitle[SHEET_TITLES.TRANSACTIONS]; 
    const rows = await sheet.getRows();

    // Kita balik urutannya (reverse) agar transaksi terbaru muncul paling atas
    const transactions = rows.map((row) => ({
      id: row.get('id'),
      date: row.get('tanggal'),
      type: row.get('tipe'), // IN atau OUT
      qr_code: row.get('kode_qr_produk'),
      qty: row.get('qty'),
      pic: row.get('petugas'),
      dept_id: row.get('id_departemen') || '-',
    })).reverse(); 

    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Validasi Input
    const validation = transactionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.flatten() }, { status: 400 });
    }

    const { qr_code, type, quantity, department_id, petugas } = validation.data;

    // 2. Load Spreadsheet
    const doc = await loadSpreadsheet();
    const productSheet = doc.sheetsByTitle[SHEET_TITLES.PRODUCTS];
    const logSheet = doc.sheetsByTitle[SHEET_TITLES.TRANSACTIONS];

    // 3. Cari Produk berdasarkan QR Code
    // (Google Sheets tidak punya query cepat, jadi kita ambil semua baris lalu filter di memori)
    const productRows = await productSheet.getRows();
    const productRow = productRows.find((row) => row.get('kode_qr') === qr_code);

    if (!productRow) {
      return NextResponse.json({ success: false, error: "QR Code tidak ditemukan di database!" }, { status: 404 });
    }

    const currentStock = parseInt(productRow.get('stok') || '0');
    const productDept = productRow.get('id_departemen');
    const productName = productRow.get('nama_produk');

    // 4. LOGIKA BISNIS: CEK DEPARTEMEN & STOK
    if (type === 'IN') {
      // Validasi "Salah Kamar"
      if (department_id && productDept !== department_id) {
        return NextResponse.json({ 
          success: false, 
          error: `SALAH GUDANG! Barang ini milik Dept: ${productDept}, tapi Anda sedang di Dept: ${department_id}` 
        }, { status: 400 });
      }
      
      // Update Stok (Tambah)
      productRow.set('stok', (currentStock + quantity).toString());
    } 
    else if (type === 'OUT') {
      // Cek Stok Cukup gak?
      if (currentStock < quantity) {
        return NextResponse.json({ 
          success: false, 
          error: `Stok tidak cukup! Sisa stok: ${currentStock}, diminta: ${quantity}` 
        }, { status: 400 });
      }

      // Update Stok (Kurang)
      productRow.set('stok', (currentStock - quantity).toString());
    }

    // 5. Simpan Perubahan Stok ke Sheet Produk
    const now = new Date().toISOString();
    productRow.set('updated_at', now);
    await productRow.save(); // <-- Ini yang menyimpan angka stok baru ke Google Sheet

    // 6. Catat ke Log Transaksi (History)
    await logSheet.addRow({
      id: uuidv4(),
      tanggal: now,
      tipe: type,
      kode_qr_produk: qr_code,
      qty: quantity,
      petugas: petugas,
      id_departemen: productDept // Kita catat aslinya barang ini punya siapa
    });

    return NextResponse.json({
      success: true,
      message: type === 'IN' ? `Berhasil memasukkan ${quantity} ${productName}` : `Berhasil mengeluarkan ${quantity} ${productName}`,
      current_stock: type === 'IN' ? currentStock + quantity : currentStock - quantity
    });

  } catch (error: any) {
    console.error("Transaction Error:", error);
    return NextResponse.json({ success: false, error: "Gagal memproses transaksi" }, { status: 500 });
  }
}