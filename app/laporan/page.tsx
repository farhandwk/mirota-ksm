'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { Loader2, ClipboardList, FileSpreadsheet, Save, Search, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

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

  // --- 1. FETCH DATA ---
  const fetchStokSaatIni = async () => {
    setLoading(true);
    try {
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
        else fetchStokSaatIni();
    } else if (status === 'unauthenticated') {
        router.push('/login');
    }
  }, [status, session, router]);

  // --- 2. HANDLE INPUT ---
  const handleFisikChange = (kode: string, val: string) => {
    setFisikValues(prev => ({ ...prev, [kode]: val }));
  };

  // --- 3. FILTER PENCARIAN ---
  const filteredData = useMemo(() => {
      if (!searchTerm) return data;
      return data.filter(item => 
        item.nama_produk.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kode_qr.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [data, searchTerm]);

  // --- 4. HITUNG STATISTIK ---
  const hitungStatistik = () => {
    let totalSistem = 0;
    let totalFisik = 0;
    let totalSelisih = 0;
    let itemsCounted = 0;

    filteredData.forEach(item => {
        totalSistem += item.stok_saat_ini;
        const valFisikStr = fisikValues[item.kode_qr];
        
        if (valFisikStr !== undefined && valFisikStr !== "") {
            const valFisik = parseInt(valFisikStr);
            totalFisik += valFisik;
            totalSelisih += (valFisik - item.stok_saat_ini);
            itemsCounted++;
        } else {
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

  // --- 6. SIMPAN DATA ---
  const handleSimpanRiwayat = async () => {
    const itemsToSave = data
        .filter(item => fisikValues[item.kode_qr] !== undefined && fisikValues[item.kode_qr] !== "")
        .map(item => {
            const fisik = parseInt(fisikValues[item.kode_qr]);
            const selisih = fisik - item.stok_saat_ini;
            let status = "COCOK";
            if (selisih < 0) status = "KURANG";
            if (selisih > 0) status = "LEBIH";
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
        alert("Belum ada data fisik yang diinput.");
        return;
    }

    if (!confirm(`Simpan ${itemsToSave.length} item hasil opname ini?`)) return;

    setSaving(true);
    try {
        const res = await fetch('/api/laporan/simpan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tanggal: new Date().toISOString(),
                items: itemsToSave
            })
        });

        const json = await res.json();
        if (res.ok) {
            alert("Berhasil disimpan! Cek menu Riwayat Opname.");
            setFisikValues({});
        } else {
            alert("Gagal: " + json.message);
        }
    } catch (e) {
        alert("Error koneksi");
    } finally {
        setSaving(false);
    }
  };

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center bg-blue-50"><Loader2 className="w-10 h-10 animate-spin text-[#004aad]" /></div>;
  if (session?.user?.role !== 'Kepala Gudang') return null;

  return (
    // 1. BACKGROUND GRADIENT KONSISTEN
    <div className="min-h-screen bg-gradient-to-br from-[#004aad]/5 via-white to-blue-50 font-sans pb-20">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 pt-24">
        
        {/* --- HEADER (GLASS STYLE) --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm relative overflow-hidden group">
            {/* Dekorasi BG */}
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <ClipboardList className="w-32 h-32 text-[#004aad]" />
            </div>

            <div className="relative z-10">
                <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 opacity-80"/> Form Stock Opname
                </h1>
                <p className="text-gray-500 mt-1 font-medium">Input hasil perhitungan fisik stok gudang (Cycle Count).</p>
            </div>

            {/* Refresh Button */}
            <Button 
                onClick={fetchStokSaatIni} 
                variant="outline"
                className="relative z-10 bg-white/80 border-gray-200 text-gray-600 hover:text-[#004aad] shadow-sm"
            >
                <RefreshCw size={16} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh Stok
            </Button>
        </div>

        {/* --- STICKY TOOLBAR (GLASS STYLE) --- */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/70 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-sm sticky top-20 z-20 transition-all">
            <div className="relative w-full md:w-96 group">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-[#004aad]" />
                <Input 
                    placeholder="Cari produk atau scan QR..." 
                    className="pl-10 bg-white/60 border-gray-200 focus:bg-white transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-100 flex items-center gap-2 shadow-sm whitespace-nowrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Total Item</span>
                    <span className="font-bold">{filteredData.length}</span>
                </div>
                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-100 flex items-center gap-2 shadow-sm whitespace-nowrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-green-500">Sudah Diinput</span>
                    <span className="font-bold">{stats.itemsCounted}</span>
                </div>
            </div>
        </div>

        {/* --- TABEL INPUT (GLASS CONTAINER) --- */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-md overflow-hidden ring-1 ring-white/50">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 backdrop-blur-sm uppercase text-xs text-gray-500 font-bold border-b border-gray-100 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4">Produk</th>
                            <th className="px-6 py-4 text-center">Stok Sistem</th>
                            <th className="px-6 py-4 text-center w-40 bg-blue-50/30 text-[#004aad] border-x border-blue-100">
                                Fisik (Input)
                            </th>
                            <th className="px-6 py-4 text-center">Selisih</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && (
                            <tr><td colSpan={4} className="px-6 py-20 text-center text-gray-500 flex flex-col items-center"><Loader2 className="w-8 h-8 animate-spin text-[#004aad] mb-2"/> Memuat data...</td></tr>
                        )}
                        {!loading && filteredData.length === 0 && (
                            <tr><td colSpan={4} className="px-6 py-20 text-center text-gray-400 font-medium">Produk tidak ditemukan.</td></tr>
                        )}
                        
                        {!loading && filteredData.map((item) => {
                            const inputVal = fisikValues[item.kode_qr] ?? "";
                            let selisihDisplay = <span className="text-gray-300">-</span>;
                            let rowClass = "hover:bg-blue-50/30";

                            if (inputVal !== "") {
                                const selisih = parseInt(inputVal) - item.stok_saat_ini;
                                if (selisih === 0) {
                                    selisihDisplay = <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">COCOK</Badge>;
                                    rowClass = "bg-green-50/20 hover:bg-green-50/30";
                                } else if (selisih < 0) {
                                    selisihDisplay = <Badge variant="destructive" className="font-bold">{selisih}</Badge>;
                                    rowClass = "bg-red-50/20 hover:bg-red-50/30";
                                } else {
                                    selisihDisplay = <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">+{selisih}</Badge>;
                                    rowClass = "bg-blue-50/20 hover:bg-blue-50/30";
                                }
                            }

                            return (
                                <tr key={item.id} className={`transition-colors group ${rowClass}`}>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800 text-base">{item.nama_produk}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] bg-gray-100 text-gray-500 font-mono px-1.5 py-0.5 rounded border border-gray-200">
                                                {item.kode_qr}
                                            </span>
                                            <span className="text-xs text-gray-400">• {item.departemen}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex flex-col">
                                            <span className="text-lg font-bold text-gray-700">{item.stok_saat_ini}</span>
                                            <span className="text-[10px] text-gray-400 uppercase">Sistem</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center bg-blue-50/20 border-x border-blue-50 p-0 relative group-focus-within:bg-blue-50/50 transition-colors">
                                        <input 
                                            type="number"
                                            className="w-full h-12 text-center bg-transparent focus:bg-white focus:ring-2 ring-inset ring-[#004aad] rounded-lg outline-none font-bold text-xl text-[#004aad] placeholder-gray-300 transition-all"
                                            placeholder="0"
                                            value={inputVal}
                                            onChange={(e) => handleFisikChange(item.kode_qr, e.target.value)}
                                            onFocus={(e) => e.target.select()} // Auto select text saat klik
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {selisihDisplay}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    {/* FOOTER TOTAL */}
                    {!loading && filteredData.length > 0 && (
                        <tfoot className="bg-gray-900 text-white border-t-4 border-[#004aad] sticky bottom-0 z-20 shadow-2xl">
                             <tr>
                                <td className="px-6 py-4 text-right text-xs uppercase font-bold tracking-wider text-gray-400">Total Keseluruhan</td>
                                <td className="px-6 py-4 text-center font-bold text-xl">{stats.totalSistem}</td>
                                <td className="px-6 py-4 text-center font-bold text-xl bg-gray-800 border-x border-gray-700">
                                    {stats.totalFisik}
                                </td>
                                <td className={`px-6 py-4 text-center font-bold text-xl ${stats.totalSelisih < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {stats.totalSelisih > 0 ? `+${stats.totalSelisih}` : stats.totalSelisih}
                                </td>
                             </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            
            {/* ACTION BUTTONS (STICKY BOTTOM BAR) */}
            <div className="p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 z-30">
                <Button 
                    onClick={handleExportExcel}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm font-medium"
                >
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                </Button>
                <Button 
                    onClick={handleSimpanRiwayat}
                    disabled={saving}
                    className="bg-[#004aad] hover:bg-blue-900 text-white font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-all px-6"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
                    {saving ? "Menyimpan..." : "Simpan Hasil Opname"}
                </Button>
            </div>
        </Card>

      </div>
    </div>
  );
}