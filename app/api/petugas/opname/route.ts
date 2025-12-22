import { NextResponse } from 'next/server';
import { loadSpreadsheet } from '../../../../lib/googleSheets';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kode_qr, nama_produk, stok_sistem, stok_fisik, petugas } = body;

    if (!kode_qr || stok_fisik === undefined) {
        return NextResponse.json({ message: 'Data tidak lengkap' }, { status: 400 });
    }

    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle['riwayat_opname'];

    const iSistem = parseInt(stok_sistem) || 0;
    const iFisik = parseInt(stok_fisik) || 0;
    const selisih = iFisik - iSistem;

    // LOGIKA STATUS GABUNGAN
    // Kita tambahkan suffix "(PENDING)" agar Kepala Gudang tahu ini butuh approval
    let statusLabel = "COCOK (PENDING)";
    if (selisih < 0) statusLabel = "KURANG (PENDING)";
    else if (selisih > 0) statusLabel = "LEBIH (PENDING)";

    await sheet.addRow({
      id_opname: `OPN-${uuidv4().slice(0, 8).toUpperCase()}`,
      tanggal: new Date().toISOString(),
      kode_qr: kode_qr,
      nama_produk: nama_produk,
      stok_sistem: iSistem,
      stok_fisik: iFisik,
      selisih: selisih,
      status: statusLabel, // Simpan status gabungan
      petugas: petugas || 'Petugas Lapangan'
    });

    return NextResponse.json({ success: true, message: "Laporan tersimpan (Menunggu Approval)" });

  } catch (error: any) {
    console.error("Error Petugas Opname:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}