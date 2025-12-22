import { NextResponse } from 'next/server';
import { loadSpreadsheet } from '../../../../lib/googleSheets';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_opname, kode_qr, stok_baru } = body;

    if (!id_opname || !kode_qr || stok_baru === undefined) {
        return NextResponse.json({ message: 'Data approval tidak lengkap' }, { status: 400 });
    }

    const doc = await loadSpreadsheet();
    const sheetOpname = doc.sheetsByTitle['riwayat_opname'];
    const sheetProduk = doc.sheetsByTitle['produk'];

    // 1. Update Status di Riwayat Opname
    const rowsOpname = await sheetOpname.getRows();
    const rowOpname = rowsOpname.find(r => r.get('id_opname') === id_opname);
    
    if (rowOpname) {
        const currentStatus = rowOpname.get('status') || '';
        
        // Cek jika sudah diapprove
        if (currentStatus.includes('APPROVED')) {
             return NextResponse.json({ message: 'Data ini sudah disetujui sebelumnya.' }, { status: 400 });
        }

        // Ganti teks "(PENDING)" menjadi "- APPROVED"
        const newStatus = currentStatus.replace('(PENDING)', '- APPROVED').replace('PENDING', 'APPROVED');
        rowOpname.set('status', newStatus);
        await rowOpname.save();
    } else {
        return NextResponse.json({ message: 'Data riwayat tidak ditemukan' }, { status: 404 });
    }

    // 2. Update Stok Master di Sheet Produk
    const rowsProduk = await sheetProduk.getRows();
    const rowProduk = rowsProduk.find(r => r.get('kode_qr') === kode_qr);

    if (rowProduk) {
        rowProduk.set('stok', stok_baru);
        // Update timestamp jika kolom updated_at ada
        if (rowProduk.get('updated_at') !== undefined) {
             rowProduk.set('updated_at', new Date().toISOString());
        }
        await rowProduk.save();
    }

    return NextResponse.json({ success: true, message: 'Stok master berhasil diperbarui!' });

  } catch (error: any) {
    console.error("Approval Error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}