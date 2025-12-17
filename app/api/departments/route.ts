import { NextResponse } from 'next/server';
import { loadSpreadsheet, SHEET_TITLES } from '../../../lib/googleSheets';

// GET: Ambil semua departemen
export async function GET() {
  try {
    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.DEPARTMENTS];
    const rows = await sheet.getRows();

    const data = rows.map((row) => ({
      id: row.get('id'),
      nama: row.get('nama'),
      deskripsi: row.get('deskripsi'),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tambah departemen baru
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nama, deskripsi } = body; // TIDAK PERLU ID LAGI DISINI

    if (!nama) {
      return NextResponse.json({ success: false, error: 'Nama departemen wajib diisi' }, { status: 400 });
    }

    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.DEPARTMENTS];
    const rows = await sheet.getRows();

    // --- LOGIKA GENERATE ID OTOMATIS (AUTO-INCREMENT) ---
    let newIdNumber = 1;

    if (rows.length > 0) {
      // Cari angka ID terbesar yang sudah ada
      const maxId = rows.reduce((max, row) => {
        const idStr = row.get('id'); // format "D-001"
        if (!idStr) return max;
        
        // Ambil angkanya saja: "D-005" -> "005" -> 5
        const num = parseInt(idStr.split('-')[1]);
        return isNaN(num) ? max : (num > max ? num : max);
      }, 0);
      
      newIdNumber = maxId + 1;
    }

    // Format jadi "D-00X" (Padding 3 digit)
    const newId = `D-${String(newIdNumber).padStart(3, '0')}`;
    // -----------------------------------------------------

    await sheet.addRow({ 
      id: newId, 
      nama, 
      deskripsi 
    });

    return NextResponse.json({ success: true, message: 'Departemen berhasil ditambah', id: newId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, nama, deskripsi } = body;

    if (!id || !nama) {
      return NextResponse.json({ success: false, error: 'ID dan Nama wajib ada' }, { status: 400 });
    }

    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.DEPARTMENTS];
    const rows = await sheet.getRows();

    // Cari baris yang ID-nya cocok
    const rowToUpdate = rows.find((r) => r.get('id') === id);

    if (!rowToUpdate) {
      return NextResponse.json({ success: false, error: 'Departemen tidak ditemukan' }, { status: 404 });
    }

    // Update data di baris tersebut
    rowToUpdate.assign({ nama, deskripsi });
    await rowToUpdate.save(); // Simpan perubahan ke Google Sheets

    return NextResponse.json({ success: true, message: 'Departemen berhasil diupdate' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus departemen (Gunakan method DELETE dengan query param ?id=...)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.DEPARTMENTS];
    const rows = await sheet.getRows();

    const rowToDelete = rows.find((r) => r.get('id') === id);
    if (!rowToDelete) return NextResponse.json({ error: 'Departemen tidak ditemukan' }, { status: 404 });

    await rowToDelete.delete();

    return NextResponse.json({ success: true, message: 'Departemen dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}