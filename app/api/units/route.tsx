import { NextResponse } from 'next/server';
import { loadSpreadsheet, SHEET_TITLES } from '../../../lib/googleSheets';

// GET: Ambil semua satuan
export async function GET() {
  try {
    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.UNITS];
    
    if (!sheet) return NextResponse.json({ success: false, error: "Sheet 'satuan' tidak ditemukan!" }, { status: 500 });

    const rows = await sheet.getRows();
    const data = rows.map((row) => ({
      id: row.get('id'),
      nama: row.get('nama'),
      keterangan: row.get('keterangan'),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tambah satuan baru (Auto ID: U-XXX)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nama, keterangan } = body;

    if (!nama) return NextResponse.json({ success: false, error: 'Nama satuan wajib diisi' }, { status: 400 });

    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.UNITS];
    if (!sheet) return NextResponse.json({ success: false, error: "Sheet 'satuan' tidak ditemukan!" }, { status: 500 });

    const rows = await sheet.getRows();

    // Auto-Increment ID
    let newIdNumber = 1;
    if (rows.length > 0) {
      const maxId = rows.reduce((max, row) => {
        const idStr = row.get('id'); // "U-001"
        if (!idStr) return max;
        const num = parseInt(idStr.split('-')[1]);
        return isNaN(num) ? max : (num > max ? num : max);
      }, 0);
      newIdNumber = maxId + 1;
    }
    const newId = `U-${String(newIdNumber).padStart(3, '0')}`;

    await sheet.addRow({ id: newId, nama, keterangan });

    return NextResponse.json({ success: true, message: 'Satuan berhasil ditambah' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Edit satuan
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, nama, keterangan } = body;

    if (!id || !nama) return NextResponse.json({ success: false, error: 'ID dan Nama wajib ada' }, { status: 400 });

    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.UNITS];
    if (!sheet) return NextResponse.json({ success: false, error: "Sheet 'satuan' tidak ditemukan!" }, { status: 500 });

    const rows = await sheet.getRows();
    const rowToUpdate = rows.find((r) => r.get('id') === id);

    if (!rowToUpdate) return NextResponse.json({ success: false, error: 'Satuan tidak ditemukan' }, { status: 404 });

    rowToUpdate.assign({ nama, keterangan });
    await rowToUpdate.save();

    return NextResponse.json({ success: true, message: 'Satuan berhasil diupdate' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus satuan
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.UNITS];
    if (!sheet) return NextResponse.json({ success: false, error: "Sheet 'satuan' tidak ditemukan!" }, { status: 500 });

    const rows = await sheet.getRows();
    const rowToDelete = rows.find((r) => r.get('id') === id);
    
    if (!rowToDelete) return NextResponse.json({ error: 'Satuan tidak ditemukan' }, { status: 404 });

    await rowToDelete.delete();
    return NextResponse.json({ success: true, message: 'Satuan dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}