import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth"; // Import Session
import { authOptions } from "../auth/[...nextauth]/route"; // Pastikan path ini sesuai dengan lokasi authOptions Anda
import { loadSpreadsheet, SHEET_TITLES } from '../../../lib/googleSheets';
import { transactionSchema } from '../../../lib/validators';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.TRANSACTIONS]; 
    const rows = await sheet.getRows();

    // Mapping data
    const transactions = rows.map((row) => ({
      id: row.get('id'),
      date: row.get('tanggal'),
      type: row.get('tipe'),
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
    // 1. CEK SESSION / LOGIN (PERBAIKAN UTAMA)
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Anda harus login." }, { status: 401 });
    }

    // Ambil nama user dari session (misal: "Budi")
    // Fallback ke email jika nama kosong, atau "Unknown" jika keduanya kosong
    const currentUser = session.user.name || session.user.email || "Unknown User";

    // 2. Baca Body Request
    const body = await request.json();

    // 3. Validasi Input (Zod)
    const validation = transactionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.flatten() }, { status: 400 });
    }

    // Kita abaikan 'petugas' dari frontend (validation.data.petugas)
    // Kita pakai 'currentUser' dari session agar aman dan akurat
    const { qr_code, type, quantity, department_id } = validation.data;

    // 4. Load Spreadsheet
    const doc = await loadSpreadsheet();
    const productSheet = doc.sheetsByTitle[SHEET_TITLES.PRODUCTS];
    const logSheet = doc.sheetsByTitle[SHEET_TITLES.TRANSACTIONS];

    // 5. Cari Produk
    const productRows = await productSheet.getRows();
    const productRow = productRows.find((row) => row.get('kode_qr') === qr_code);

    if (!productRow) {
      return NextResponse.json({ success: false, error: "QR Code tidak ditemukan di database!" }, { status: 404 });
    }

    const currentStock = parseInt(productRow.get('stok') || '0');
    const productDept = productRow.get('id_departemen');
    const productName = productRow.get('nama_produk');

    // 6. LOGIKA BISNIS
    if (type === 'IN') {
      // Validasi Salah Kamar
      if (department_id && productDept !== department_id) {
        return NextResponse.json({ 
          success: false, 
          error: `SALAH GUDANG! Barang ini milik Dept: ${productDept}, tapi Anda sedang di Dept: ${department_id}` 
        }, { status: 400 });
      }
      
      // Tambah Stok
      productRow.set('stok', (currentStock + quantity).toString());
    } 
    else if (type === 'OUT') {
      // Cek Stok Cukup
      if (currentStock < quantity) {
        return NextResponse.json({ 
          success: false, 
          error: `Stok tidak cukup! Sisa stok: ${currentStock}, diminta: ${quantity}` 
        }, { status: 400 });
      }

      // Kurang Stok
      productRow.set('stok', (currentStock - quantity).toString());
    }

    // 7. Simpan Perubahan Stok ke Sheet Produk
    const now = new Date().toISOString();
    productRow.set('updated_at', now);
    await productRow.save();

    // 8. Catat ke Log Transaksi (History)
    // PERHATIKAN: kolom 'petugas' diisi oleh variable 'currentUser'
    await logSheet.addRow({
      id: uuidv4(),
      tanggal: now,
      tipe: type,
      kode_qr_produk: qr_code,
      qty: quantity,
      
      petugas: currentUser, // <-- INI PERBAIKANNYA (Dynamic User)
      
      id_departemen: productDept
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