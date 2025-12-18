import { NextResponse } from 'next/server';
import { doc, loadSpreadsheet } from '../../../../lib/googleSheets'; // Pastikan path import ini sesuai struktur folder Anda

export async function GET(request: Request) {
  try {
    // 1. Ambil Parameter Tanggal dari URL
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { message: 'Tanggal awal dan akhir wajib diisi' },
        { status: 400 }
      );
    }

    // Konversi string input (YYYY-MM-DD) ke Object Date
    const startDate = new Date(`${startDateParam}T00:00:00`);
    const endDate = new Date(`${endDateParam}T23:59:59`);

    // 2. Load Spreadsheet
    await loadSpreadsheet();
    
    const sheetProduk = doc.sheetsByTitle['produk'];
    const sheetTransaksi = doc.sheetsByTitle['transaksi'];

    if (!sheetProduk || !sheetTransaksi) {
      throw new Error("Sheet 'produk' atau 'transaksi' tidak ditemukan!");
    }

    // Ambil semua baris data
    const rowsProduk = await sheetProduk.getRows();
    const rowsTransaksi = await sheetTransaksi.getRows();

    // 3. Grouping Transaksi berdasarkan Kode Produk (Optimasi)
    const transaksiMap: Record<string, any[]> = {};

    rowsTransaksi.forEach((row) => {
      const kode = row.get('kode_qr_produk');
      if (!transaksiMap[kode]) transaksiMap[kode] = [];
      
      // Ambil tanggal dan qty dengan aman
      const rawDate = row.get('tanggal');
      const qty = parseInt(row.get('qty') || '0', 10);
      
      transaksiMap[kode].push({
        tanggal: rawDate, 
        tipe: row.get('tipe'), // IN atau OUT
        qty: isNaN(qty) ? 0 : qty
      });
    });

    // 4. Hitung Laporan (Murni berdasarkan Transaksi di Range Tanggal)
    const laporan = rowsProduk.map((prod) => {
      const kodeQR = prod.get('kode_qr');
      const namaProduk = prod.get('nama_produk');
      
      // Ambil riwayat transaksi produk ini
      const history = transaksiMap[kodeQR] || [];

      let masukPeriode = 0;
      let keluarPeriode = 0;

      history.forEach((t) => {
        // Parsing tanggal transaksi
        // Asumsi format di sheet adalah ISO String (misal: 2025-12-18T14:30:00.000Z)
        // Jika format di sheet berbeda, logic parsing ini harus disesuaikan
        const tglTransaksi = new Date(t.tanggal);
        
        // Filter: Apakah transaksi terjadi di antara Start dan End Date?
        if (tglTransaksi >= startDate && tglTransaksi <= endDate) {
          if (t.tipe === 'IN') {
            masukPeriode += t.qty;
          } else if (t.tipe === 'OUT') {
            keluarPeriode += t.qty;
          }
        }
      });

      // --- LOGIKA UTAMA DIUBAH DISINI ---
      // Tidak lagi mengambil stok dari master produk.
      // Stok Sistem = (Total Masuk di range ini) - (Total Keluar di range ini)
      const stokHitunganMurni = masukPeriode - keluarPeriode;

      return {
        kode_qr: kodeQR,
        nama_produk: namaProduk,
        stok_saat_ini: stokHitunganMurni, // Nilai ini yang akan muncul di kolom "Stok Sistem"
        masuk: masukPeriode,
        keluar: keluarPeriode,
      };
    });

    return NextResponse.json({ data: laporan });

  } catch (error: any) {
    console.error("Error Laporan:", error);
    return NextResponse.json(
      { message: 'Gagal memuat laporan', error: error.message },
      { status: 500 }
    );
  }
}