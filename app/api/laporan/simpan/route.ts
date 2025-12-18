import { NextResponse } from 'next/server';
import { loadSpreadsheet } from '../../../../lib/googleSheets';
import { v4 as uuidv4 } from 'uuid'; // Kita pakai UUID agar ID Opname unik

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, tanggal } = body; // items = array data barang yang diopname

    if (!items || items.length === 0) {
      return NextResponse.json({ message: 'Tidak ada data untuk disimpan' }, { status: 400 });
    }

    // 1. Load Spreadsheet
    const doc = await loadSpreadsheet();
    
    // Pastikan nama sheet sesuai dengan yang Anda buat di Langkah 1
    const sheet = doc.sheetsByTitle['riwayat_opname'];
    if (!sheet) {
      return NextResponse.json({ message: "Sheet 'riwayat_opname' tidak ditemukan di Google Sheets!" }, { status: 500 });
    }

    // 2. Buat ID Unik untuk sesi opname ini (Batch ID)
    // Contoh: OPN-20251218-XYZ
    const idOpname = `OPN-${tanggal.replace(/-/g, '')}-${uuidv4().slice(0, 4).toUpperCase()}`;

    // 3. Format data untuk Google Sheets
    // Kita filter: Hanya simpan item yang MEMANG DIISI stok fisiknya (atau simpan semua sesuai kebijakan, disini kita simpan semua agar lengkap)
    const rowsToAdd = items.map((item: any) => ({
      id_opname: idOpname,
      tanggal: tanggal, // Tanggal opname dilakukan
      kode_qr: item.kode_qr,
      nama_produk: item.nama_produk,
      stok_sistem: item.stok_sistem,
      stok_fisik: item.stok_fisik,
      selisih: item.selisih,
      status: item.status // COCOK, LEBIH, KURANG
    }));

    // 4. Eksekusi Simpan
    await sheet.addRows(rowsToAdd);

    return NextResponse.json({ 
      message: 'Berhasil menyimpan riwayat opname!',
      id_opname: idOpname
    });

  } catch (error: any) {
    console.error("Error Saving Opname:", error);
    return NextResponse.json(
      { message: 'Gagal menyimpan data', error: error.message },
      { status: 500 }
    );
  }
}