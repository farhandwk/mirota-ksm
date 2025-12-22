import { NextResponse } from 'next/server';
import { loadSpreadsheet } from '../../../../lib/googleSheets';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_opname } = body; 

    if (!id_opname) {
        return NextResponse.json({ message: 'ID Opname wajib ada' }, { status: 400 });
    }

    const doc = await loadSpreadsheet();
    const sheetOpname = doc.sheetsByTitle['riwayat_opname'];

    if (!sheetOpname) {
        return NextResponse.json({ message: 'Sheet tidak ditemukan' }, { status: 500 });
    }

    const rowsOpname = await sheetOpname.getRows();
    const rowOpname = rowsOpname.find(r => r.get('id_opname') === id_opname);
    
    if (!rowOpname) {
        return NextResponse.json({ message: 'Data opname sudah tidak ada / terhapus' }, { status: 404 });
    }

    const currentStatus = rowOpname.get('status') || '';

    // Safety: Jangan sampai menghapus data yang SUDAH diapprove (karena stok master sudah berubah)
    if (currentStatus.includes('APPROVED')) {
        return NextResponse.json({ message: 'TIDAK BISA MENGHAPUS: Data ini sudah disetujui dan stok sudah berubah.' }, { status: 400 });
    }

    // --- LOGIKA BARU: HAPUS BARIS ---
    await rowOpname.delete();

    return NextResponse.json({ 
        success: true, 
        message: 'Permintaan approval berhasil dihapus permanen.' 
    });

  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}