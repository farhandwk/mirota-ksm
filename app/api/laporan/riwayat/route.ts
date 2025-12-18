import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// Helper sederhana untuk parsing angka dengan aman
const parseSafeInt = (value: any) => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? 0 : parsed; // Jika NaN atau null, kembalikan 0
};

export async function GET() {
  try {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(
      process.env.GOOGLE_SHEET_ID!,
      serviceAccountAuth
    );

    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["riwayat_opname"];

    // ERROR HANDLING 1: Sheet tidak ditemukan
    if (!sheet) {
      console.warn("Sheet 'riwayat_opname' tidak ditemukan.");
      return NextResponse.json([], { status: 200 }); // Kembalikan array kosong, jangan error 404 agar UI tetap jalan
    }

    const rows = await sheet.getRows();

    // ERROR HANDLING 2: Sheet ada tapi baris kosong
    if (!rows || rows.length === 0) {
      return NextResponse.json([]); 
    }

    // Mapping dengan Safety Check untuk setiap Cell
    const cleanData = rows.map((row) => ({
      id_opname: row.get("id_opname") || `OPN-UNKNOWN-${Math.random()}`, // Fallback ID
      tanggal: row.get("tanggal") || new Date().toISOString().split('T')[0], // Fallback tanggal hari ini
      kode_qr: row.get("kode_qr") || "-",
      nama_produk: row.get("nama_produk") || "Produk Tanpa Nama",
      
      // Gunakan helper parseSafeInt agar tidak ada NaN
      stok_sistem: parseSafeInt(row.get("stok_sistem")),
      stok_fisik: parseSafeInt(row.get("stok_fisik")),
      selisih: parseSafeInt(row.get("selisih")),
      
      status: row.get("status") || "PENDING",
    }));

    return NextResponse.json(cleanData);

  } catch (error) {
    console.error("Critical Spreadsheet Error:", error);
    // ERROR HANDLING 3: Jika koneksi Google gagal total
    // Tetap kembalikan array kosong agar frontend tidak White Screen of Death
    return NextResponse.json([], { status: 500 });
  }
}