import { NextResponse } from 'next/server';
import { loadSpreadsheet, SHEET_TITLES } from '../../../lib/googleSheets';

// GET: Ambil semua user
export async function GET() {
  try {
    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.USERS];
    
    if (!sheet) return NextResponse.json({ success: false, error: "Sheet 'users' tidak ditemukan!" }, { status: 500 });

    const rows = await sheet.getRows();
    const data = rows.map((row) => ({
      username: row.get('username'),
      password: row.get('password'), // Kita kirim password karena requirementnya plain text management
      role: row.get('role'),
      fullname: row.get('fullname'),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tambah user baru
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, role, fullname } = body;

    if (!username || !password || !role) {
      return NextResponse.json({ success: false, error: 'Username, Password, dan Role wajib diisi' }, { status: 400 });
    }

    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.USERS];
    const rows = await sheet.getRows();

    // Cek duplikat username
    const isExist = rows.some((row) => row.get('username') === username);
    if (isExist) {
      return NextResponse.json({ success: false, error: 'Username sudah digunakan!' }, { status: 400 });
    }

    await sheet.addRow({ username, password, role, fullname });

    return NextResponse.json({ success: true, message: 'User berhasil ditambah' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Edit user (Berdasarkan Username)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { username, password, role, fullname } = body;

    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.USERS];
    const rows = await sheet.getRows();

    const rowToUpdate = rows.find((r) => r.get('username') === username);
    if (!rowToUpdate) return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });

    rowToUpdate.assign({ password, role, fullname });
    await rowToUpdate.save();

    return NextResponse.json({ success: true, message: 'User berhasil diupdate' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus user
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

    const doc = await loadSpreadsheet();
    const sheet = doc.sheetsByTitle[SHEET_TITLES.USERS];
    const rows = await sheet.getRows();

    const rowToDelete = rows.find((r) => r.get('username') === username);
    if (!rowToDelete) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

    await rowToDelete.delete();

    return NextResponse.json({ success: true, message: 'User dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}