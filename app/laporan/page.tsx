'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { Loader2, ClipboardList, FileSpreadsheet, Save, Search, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Input } from "../../components/ui/input"; // Pastikan punya komponen Input UI

interface LaporanItem {
  id: string;
  kode_qr: string;
  nama_produk: string;
  stok_saat_ini: number;
  departemen: string;
}

export default function LaporanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State Data
  const [data, setData] = useState<LaporanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State Input & Filter
  const [fisikValues, setFisikValues] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");

  // --- 1. FETCH DATA SAAT LOAD ---
  const fetchStokSaatIni = async () => {
    setLoading(true);
    try {
      // Panggil API baru yang simpel tadi (tanpa parameter tanggal)
      const res = await fetch('/api/laporan/stok');
      const json = await res.json();
      
      if (res.ok && Array.isArray(json.data)) {
        setData(json.data);
      } else {
        alert("Gagal mengambil data stok master.");
        setData([]);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
        if (session?.user?.role !== 'Kepala Gudang') router.push('/login');
        else fetchStokSaatIni(); // Auto fetch saat login sukses
    } else if (status === 'unauthenticated') {
        router.push('/login');
    }
  }, [status, session, router]);

  // --- 2. HANDLE INPUT FISIK ---
  const handleFisikChange = (kode: string, val: string) => {
    setFisikValues(prev => ({ ...prev, [kode]: val }));
  };

  // --- 3. FILTER PENCARIAN (Client Side) ---
  const filteredData = useMemo(() => {
      if (!searchTerm) return data;
      return data.filter(item => 
        item.nama_produk.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kode_qr.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [data, searchTerm]);

  // --- 4. HITUNG TOTAL & SELISIH ---
  const hitungStatistik = () => {
    let totalSistem = 0;
    let totalFisik = 0;
    let totalSelisih = 0;
    let itemsCounted = 0;

    filteredData.forEach(item => {
        totalSistem += item.stok_saat_ini;
        const valFisikStr = fisikValues[item.kode_qr];
        
        // Jika fisik diisi, baru kita hitung
        if (valFisikStr !== undefined && valFisikStr !== "") {
            const valFisik = parseInt(valFisikStr);
            totalFisik += valFisik;
            totalSelisih += (valFisik - item.stok_saat_ini);
            itemsCounted++;
        } else {
            // Jika belum diisi, kita anggap fisik = sistem (selisih 0) untuk sementara
            // atau abaikan dari total fisik
            totalFisik += item.stok_saat_ini; 
        }
    });

    return { totalSistem, totalFisik, totalSelisih, itemsCounted };
  };
  const stats = hitungStatistik();

  // --- 5. EXPORT EXCEL ---
  const handleExportExcel = () => {
    const dataToExport = filteredData.map(item => {
      const inputFisik = fisikValues[item.kode_qr] ?? "";
      let selisih = 0;
      let status = "Belum Dihitung";
      
      if (inputFisik !== "") {
        const fisik = parseInt(inputFisik);
        selisih = fisik - item.stok_saat_ini;
        status = selisih === 0 ? "COCOK" : (selisih < 0 ? "KURANG" : "LEBIH");
      }

      return {
        "Kode QR": item.kode_qr,
        "Nama Produk": item.nama_produk,
        "Dept": item.departemen,
        "Stok Sistem": item.stok_saat_ini,
        "Stok Fisik": inputFisik === "" ? "-" : parseInt(inputFisik),
        "Selisih": inputFisik === "" ? "-" : selisih,
        "Status": status
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Opname");
    XLSX.writeFile(workbook, `StockOpname_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- 6. SIMPAN KE DATABASE (SUBMIT OPNAME) ---
  const handleSimpanRiwayat = async () => {
    // Filter hanya item yang SUDAH DIINPUT fisiknya
    const itemsToSave = data
        .filter(item => fisikValues[item.kode_qr] !== undefined && fisikValues[item.kode_qr] !== "")
        .map(item => {
            const fisik = parseInt(fisikValues[item.kode_qr]);
            const selisih = fisik - item.stok_saat_ini;
            let status = "COCOK";
            if (selisih < 0) status = "KURANG";
            if (selisih > 0) status = "LEBIH";

            // Tambahkan flag PENDING untuk approval
            status += " (PENDING)";

            return {
                kode_qr: item.kode_qr,
                nama_produk: item.nama_produk,
                stok_sistem: item.stok_saat_ini,
                stok_fisik: fisik,
                selisih: selisih,
                status: status
            };
        });

    if (itemsToSave.length === 0) {
        alert("Belum ada data fisik yang diinput. Silakan isi kolom 'Hitungan Fisik' terlebih dahulu.");
        return;
    }

    if (!confirm(`Simpan ${itemsToSave.length} item hasil opname ini ke riwayat?`)) return;

    setSaving(true);
    try {
        const res = await fetch('/api/laporan/simpan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tanggal: new Date().toISOString(), // Timestamp saat ini
                items: itemsToSave
            })
        });

        const json = await res.json();
        if (res.ok) {
            alert("Berhasil disimpan! Silakan cek menu Riwayat Opname untuk Approval.");
            setFisikValues({}); // Reset form setelah simpan
        } else {
            alert("Gagal: " + json.message);
        }
    } catch (e) {
        alert("Error koneksi");
    } finally {
        setSaving(false);
    }
  };


  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#004aad]" /></div>;
  if (session?.user?.role !== 'Kepala Gudang') return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <Navbar />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-[#004aad]">
                    <ClipboardList className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Form Stock Opname</h1>
                    <p className="text-sm text-gray-500">Input hasil perhitungan fisik gudang hari ini.</p>
                </div>
            </div>

            {/* Tombol Refresh */}
            <button 
                onClick={fetchStokSaatIni} 
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#004aad] transition-colors"
                title="Ambil ulang data stok terbaru"
            >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh Stok
            </button>
        </div>

        {/* Toolbar Pencarian & Info */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                    placeholder="Cari nama produk atau kode QR..." 
                    className="pl-9 bg-gray-50 border-gray-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex gap-4 text-sm font-medium">
                <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg">
                    Total Item: <b>{filteredData.length}</b>
                </div>
                <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg">
                    Sudah Diinput: <b>{stats.itemsCounted}</b>
                </div>
            </div>
        </div>

        {/* TABEL INPUT */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 uppercase text-xs text-gray-500 font-semibold border-b">
                        <tr>
                            <th className="px-6 py-4">Produk</th>
                            <th className="px-6 py-4 text-center">Stok Sistem</th>
                            <th className="px-6 py-4 text-center w-40 bg-blue-50/50 border-l border-blue-100 text-[#004aad]">
                                Fisik (Input)
                            </th>
                            <th className="px-6 py-4 text-center border-l border-gray-200">Selisih</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading && (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2"/> Memuat data master...</td></tr>
                        )}
                        {!loading && filteredData.length === 0 && (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">Produk tidak ditemukan.</td></tr>
                        )}
                        
                        {!loading && filteredData.map((item) => {
                            const inputVal = fisikValues[item.kode_qr] ?? "";
                            let selisihDisplay = <span className="text-gray-300">-</span>;
                            let rowClass = "";

                            if (inputVal !== "") {
                                const selisih = parseInt(inputVal) - item.stok_saat_ini;
                                if (selisih === 0) {
                                    selisihDisplay = <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-bold text-xs">OK</span>;
                                    rowClass = "bg-green-50/30";
                                } else if (selisih < 0) {
                                    selisihDisplay = <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold text-xs">{selisih}</span>;
                                    rowClass = "bg-red-50/30";
                                } else {
                                    selisihDisplay = <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold text-xs">+{selisih}</span>;
                                    rowClass = "bg-blue-50/30";
                                }
                            }

                            return (
                                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${rowClass}`}>
                                    <td className="px-6 py-3">
                                        <div className="font-semibold text-gray-900">{item.nama_produk}</div>
                                        <div className="text-xs text-gray-400 font-mono">{item.kode_qr}</div>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold">{item.stok_saat_ini}</span>
                                    </td>
                                    <td className="px-6 py-2 text-center border-l border-blue-100 bg-blue-50/20 p-0">
                                        <input 
                                            type="number"
                                            className="w-full h-10 text-center bg-transparent focus:bg-white focus:ring-2 ring-inset ring-[#004aad] outline-none font-bold text-[#004aad] placeholder-gray-300 transition-all"
                                            placeholder="..."
                                            value={inputVal}
                                            onChange={(e) => handleFisikChange(item.kode_qr, e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-3 text-center border-l border-gray-200">
                                        {selisihDisplay}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    {/* FOOTER TOTAL */}
                    {!loading && filteredData.length > 0 && (
                        <tfoot className="bg-gray-800 text-white border-t-2 border-gray-900 sticky bottom-0 z-10">
                             <tr>
                                <td className="px-6 py-3 text-right text-xs uppercase font-bold tracking-wider">Total Sistem</td>
                                <td className="px-6 py-3 text-center font-bold text-lg">{stats.totalSistem}</td>
                                <td className="px-6 py-3 text-center font-bold text-lg bg-gray-700 border-x border-gray-600">
                                    {stats.totalFisik}
                                </td>
                                <td className={`px-6 py-3 text-center font-bold text-lg ${stats.totalSelisih < 0 ? 'text-red-300' : 'text-green-300'}`}>
                                    {stats.totalSelisih > 0 ? `+${stats.totalSelisih}` : stats.totalSelisih}
                                </td>
                             </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            
            {/* ACTION BUTTONS (Floating bar at bottom or fixed) */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0">
                <button 
                    onClick={handleExportExcel}
                    className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium flex items-center gap-2 shadow-sm"
                >
                    <FileSpreadsheet size={18} /> Export Excel
                </button>
                <button 
                    onClick={handleSimpanRiwayat}
                    disabled={saving}
                    className="px-6 py-2.5 bg-[#004aad] text-white rounded-lg hover:bg-blue-800 font-bold flex items-center gap-2 shadow-md disabled:opacity-50 transition-all transform active:scale-95"
                >
                    {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                    {saving ? "Menyimpan..." : "Simpan Hasil Opname"}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}