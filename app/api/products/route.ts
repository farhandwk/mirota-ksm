import { NextResponse } from 'next/server';
import { loadSpreadsheet, SHEET_TITLES } from '../../../lib/googleSheets';
import { productSchema } from '../../../lib/validators'; // Pastikan path ini benar
import { v4 as uuidv4 } from 'uuid';

// 1. GET: Ambil Semua Data Produk
export async function GET() {
  try {
    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.PRODUCTS];
    const rows = await sheet.getRows();

    const products = rows.map((row) => ({
      id: row.get('id'),
      qr_code: row.get('kode_qr'),
      name: row.get('nama_produk'),
      department_id: row.get('id_departemen'),
      stock: parseInt(row.get('stok') || '0'),
      unit: row.get('satuan'),
    }));

    // Sortir agar produk terbaru (yang baru diinput) ada di atas/bawah sesuai selera
    // Disini kita biarkan default urutan spreadsheet
    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. POST: Tambah Produk Baru
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
    // Logic QR: ID_DEPT + 3 Huruf Random + 4 Digit Detik
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

    return NextResponse.json({ success: true, message: "Produk berhasil ditambahkan!" });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Gagal Server" }, { status: 500 });
  }
}

// 3. PUT: Edit Data Produk
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // Validasi input minimal
    if (!body.id || !body.nama_produk || !body.id_departemen) {
        return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.PRODUCTS];
    const rows = await sheet.getRows();

    // Cari baris berdasarkan ID
    const rowToEdit = rows.find((row) => row.get('id') === body.id);

    if (!rowToEdit) {
        return NextResponse.json({ success: false, error: "Produk tidak ditemukan" }, { status: 404 });
    }

    // UPDATE DATA
    // Kita HANYA mengizinkan update Nama, Dept, dan Satuan.
    // Stok dan QR Code dilarang diubah disini demi integritas data.
    rowToEdit.set('nama_produk', body.nama_produk);
    rowToEdit.set('id_departemen', body.id_departemen);
    rowToEdit.set('satuan', body.satuan);
    rowToEdit.set('updated_at', new Date().toISOString());

    await rowToEdit.save();

    return NextResponse.json({ success: true, message: "Produk berhasil diupdate" });

  } catch (error: any) {
    console.error("PUT Error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengupdate data" }, { status: 500 });
  }
}

// 4. DELETE: Hapus Produk (Dengan Pengaman)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ success: false, error: "ID Produk diperlukan" }, { status: 400 });
    }

    const doc = await loadSpreadsheet();
    const sheetProduct = doc.sheetsByTitle[SHEET_TITLES.PRODUCTS];
    const sheetTrans = doc.sheetsByTitle[SHEET_TITLES.TRANSACTIONS];

    // 1. Cari Produknya dulu
    const rowsProduct = await sheetProduct.getRows();
    const rowToDelete = rowsProduct.find((row) => row.get('id') === id);

    if (!rowToDelete) {
        return NextResponse.json({ success: false, error: "Produk tidak ditemukan" }, { status: 404 });
    }

    const qrCode = rowToDelete.get('kode_qr');

    // 2. SAFETY CHECK (PENTING!)
    // Cek apakah produk ini punya riwayat di tabel transaksi?
    const rowsTrans = await sheetTrans.getRows();
    const hasHistory = rowsTrans.some((row) => row.get('kode_qr_produk') === qrCode);

    if (hasHistory) {
        return NextResponse.json({ 
            success: false, 
            error: "DITOLAK: Produk ini memiliki riwayat transaksi. Menghapusnya akan merusak data laporan. Silakan arsipkan atau nol-kan stoknya saja." 
        }, { status: 400 });
    }

    // 3. Jika aman (tidak ada history), baru hapus
    await rowToDelete.delete();

    return NextResponse.json({ success: true, message: "Produk berhasil dihapus permanen" });

  } catch (error: any) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus data" }, { status: 500 });
  }
}