'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Loader2, ClipboardList, FileSpreadsheet, Save } from 'lucide-react'; // Tambah icon Save
import * as XLSX from 'xlsx';

interface LaporanItem {
  kode_qr: string;
  nama_produk: string;
  stok_saat_ini: number;
  masuk: number;
  keluar: number;
}

export default function LaporanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<LaporanItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false); // State loading saat menyimpan
  const [fisikValues, setFisikValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'Kepala Gudang') {
        router.push('/login');
      }
    }
  }, [status, session, router]);

  const fetchLaporan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return alert("Mohon isi tanggal awal dan akhir!");

    setLoading(true);
    try {
      const res = await fetch(`/api/laporan/stok?startDate=${startDate}&endDate=${endDate}`);
      
      // PERBAIKAN 1: Cek tipe konten sebelum parse JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
         throw new Error("Respon server bukan JSON (Mungkin error 500)");
      }

      const json = await res.json();
      
      if (res.ok) {
        // PERBAIKAN 2: Pastikan json.data benar-benar Array
        // Jika null/undefined, paksa jadi array kosong [] agar tidak crash
        setData(Array.isArray(json.data) ? json.data : []); 
        setFisikValues({});
      } else {
        alert(json.message || "Terjadi kesalahan");
        setData([]); // Set kosong jika error
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menghubungi server atau data korup.");
      setData([]); // Set kosong jika catch error
    } finally {
      setLoading(false);
    }
  };

  const handleFisikChange = (kode: string, val: string) => {
    setFisikValues(prev => ({ ...prev, [kode]: val }));
  };

  // --- FUNGSI EXPORT EXCEL (Sama seperti sebelumnya) ---
  const handleExportExcel = () => {
    if (!data) return;
    const dataToExport = data.map(item => {
      const stokSistem = item.stok_saat_ini;
      const inputFisik = fisikValues[item.kode_qr] ?? "";
      let selisih = 0;
      let status = "Belum Dihitung";
      if (inputFisik !== "") {
        const stokFisik = parseInt(inputFisik) || 0;
        selisih = stokFisik - stokSistem;
        if (selisih === 0) status = "COCOK";
        else if (selisih < 0) status = "KURANG";
        else status = "LEBIH";
      }
      return {
        "Kode Barang": item.kode_qr,
        "Nama Produk": item.nama_produk,
        "Stok Sistem": stokSistem,
        "Stok Fisik (Input)": inputFisik === "" ? 0 : parseInt(inputFisik),
        "Selisih": inputFisik === "" ? 0 : selisih,
        "Status": status
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil Opname");
    XLSX.writeFile(workbook, `Opname_Mirota_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- FITUR BARU: SIMPAN KE DATABASE ---
  const handleSimpanRiwayat = async () => {
    if (!data) return;
    
    // Konfirmasi dulu agar tidak kepencet
    if (!confirm("Apakah Anda yakin ingin menyimpan hasil Stock Opname ini ke database? Data yang sudah disimpan akan menjadi riwayat permanen.")) return;

    setSaving(true);
    try {
      // 1. Siapkan Payload Data
      const itemsToSave = data.map(item => {
        const stokSistem = item.stok_saat_ini;
        const inputFisik = fisikValues[item.kode_qr] ?? ""; 
        let selisih = 0;
        let statusOpname = "Belum Dihitung";
        let finalFisik = stokSistem; // Default jika tidak diisi, dianggap sama (atau 0 tergantung kebijakan)

        if (inputFisik !== "") {
          finalFisik = parseInt(inputFisik);
          selisih = finalFisik - stokSistem;
          if (selisih === 0) statusOpname = "COCOK";
          else if (selisih < 0) statusOpname = "KURANG";
          else statusOpname = "LEBIH";
        } else {
            // Kebijakan: Jika kosong, apakah dianggap 0 atau dianggap belum dihitung?
            // Disini kita simpan sbg 0 dan status 'Tidak Ada Input' agar jelas di laporan
            finalFisik = 0;
            selisih = 0 - stokSistem;
            statusOpname = "TIDAK DIINPUT"; 
        }

        return {
          kode_qr: item.kode_qr,
          nama_produk: item.nama_produk,
          stok_sistem: stokSistem,
          stok_fisik: finalFisik,
          selisih: selisih,
          status: statusOpname
        };
      });

      // 2. Kirim ke API  new Date().toISOString().split('T')[0]
      const res = await fetch('/api/laporan/simpan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: endDate, // Tanggal hari ini
          items: itemsToSave
        })
      });

      const json = await res.json();

      if (res.ok) {
        alert(`Sukses! Riwayat tersimpan dengan ID: ${json.id_opname}`);
        // Opsional: Reset form atau redirect ke halaman riwayat
      } else {
        alert("Gagal menyimpan: " + json.message);
      }

    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan koneksi saat menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  // --- HITUNG TOTAL (Sama seperti sebelumnya) ---
  const hitungTotal = () => {
    if (!data) return { tSistem: 0, tFisik: 0, tSelisih: 0 };
    let tSistem = 0;
    let tFisik = 0;
    data.forEach(item => {
      tSistem += item.stok_saat_ini;
      const valFisik = parseInt(fisikValues[item.kode_qr] || '0');
      tFisik += valFisik;
    });
    const tSelisih = tFisik - tSistem;
    return { tSistem, tFisik, tSelisih };
  };
  const totals = hitungTotal();

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#004aad]" /></div>;
  if (session?.user?.role !== 'Kepala Gudang') return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />

      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg text-[#004aad]">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Laporan & Stock Opname</h1>
        </div>

        {/* Card Filter */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <form onSubmit={fetchLaporan} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Awal</label>
              <input 
                type="date" 
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] outline-none"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Akhir</label>
              <input 
                type="date" 
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] outline-none"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div className="w-full md:w-auto">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#004aad] text-white px-8 py-2.5 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {loading ? (
                  <><Loader2 className="animate-spin h-5 w-5" /> Memproses...</>
                ) : (
                  'Tampilkan Data'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Tabel Hasil */}
        {data && (
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-semibold text-gray-700">
                Periode: <span className="text-[#004aad]">{startDate}</span> s/d <span className="text-[#004aad]">{endDate}</span>
              </h2>
              <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">Total Item: {data.length}</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Produk</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Stok Sistem</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-[#004aad] uppercase tracking-wider bg-blue-50/50 border-l border-blue-100 w-32">
                      Hitungan Fisik
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 border-l border-gray-200">
                      Selisih
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                        Tidak ada data barang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    data.map((item) => {
                      const stokSistem = item.stok_saat_ini;
                      const inputFisik = fisikValues[item.kode_qr] ?? "";
                      let selisih = 0;
                      let displaySelisih: React.ReactNode = "-";
                      if (inputFisik !== "") {
                        const stokFisik = parseInt(inputFisik) || 0;
                        selisih = stokFisik - stokSistem;
                        if (selisih === 0) displaySelisih = <span className="text-green-600 font-bold bg-green-100 px-2 py-1 rounded">OK</span>;
                        else if (selisih < 0) displaySelisih = <span className="text-red-600 font-bold bg-red-100 px-2 py-1 rounded">{selisih}</span>;
                        else displaySelisih = <span className="text-blue-600 font-bold bg-blue-100 px-2 py-1 rounded">+{selisih}</span>;
                      }
                      return (
                        <tr key={item.kode_qr} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900 group-hover:text-[#004aad]">{item.nama_produk}</div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">{item.kode_qr}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-gray-100 font-bold text-gray-700">{item.stok_saat_ini}</span>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-center bg-blue-50/30 border-l border-blue-100">
                            <input 
                              type="number"
                              className="w-full text-center border-2 border-blue-200 rounded-md p-1.5 focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] outline-none font-bold text-gray-800 bg-white shadow-sm"
                              placeholder="..."
                              value={inputFisik}
                              onChange={(e) => handleFisikChange(item.kode_qr, e.target.value)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center border-l border-gray-200 bg-gray-50/50">{displaySelisih}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Footer Total */}
                {data.length > 0 && (
                  <tfoot className="bg-gray-800 text-white border-t-2 border-gray-900">
                    <tr>
                      <td className="px-6 py-4 text-right uppercase text-sm font-bold tracking-wider">Total Keseluruhan</td>
                      <td className="px-6 py-4 text-center text-lg font-bold">{totals.tSistem.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center text-lg font-bold bg-gray-700 border-x border-gray-600">{totals.tFisik.toLocaleString()}</td>
                      <td className={`px-6 py-4 text-center text-lg font-bold ${totals.tSelisih < 0 ? 'bg-red-900/50 text-red-200' : totals.tSelisih > 0 ? 'bg-blue-900/50 text-blue-200' : 'bg-green-900/50 text-green-200'}`}>
                        {totals.tSelisih > 0 ? `+${totals.tSelisih}` : totals.tSelisih}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* --- ACTION BUTTONS --- */}
            <div className="p-4 bg-gray-100 border-t border-gray-200 flex justify-end gap-3">
               {/* Export Excel */}
               <button 
                onClick={handleExportExcel}
                className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-bold shadow-sm"
              >
                <FileSpreadsheet className="w-5 h-5" />
                Export Excel
              </button>

              {/* Tombol Simpan Database (BARU) */}
              <button 
                onClick={handleSimpanRiwayat}
                disabled={saving}
                className="bg-[#004aad] text-white px-6 py-2.5 rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 font-bold shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Menyimpan...' : 'Simpan Riwayat'}
              </button>
            </div>
            {/* ---------------------- */}
          </div>
        )}
      </div>
    </div>
  );
}