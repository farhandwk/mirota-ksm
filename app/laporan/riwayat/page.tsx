"use client";

import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2, AlertCircle } from "lucide-react"; 
import { Button } from "../../../components/ui/button"; 
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Navbar  from '../../../components/Navbar'

interface RiwayatItem {
  id_opname: string;
  tanggal: string;
  kode_qr: string;
  nama_produk: string;
  stok_sistem: number;
  stok_fisik: number;
  selisih: number;
  status: string;
}

export default function HalamanRiwayatOpname() {
  // Inisialisasi dengan array kosong [] SANGAT PENTING
  const [rawData, setRawData] = useState<RiwayatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/laporan/riwayat");
        
        if (!res.ok) throw new Error("Gagal terhubung ke server");
        
        const data = await res.json();

        // SAFETY CHECK: Pastikan yang diterima benar-benar Array
        if (Array.isArray(data)) {
          setRawData(data);
        } else {
          // Jika API mengembalikan object error atau null
          console.error("Format data salah:", data);
          setRawData([]); 
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setErrorMsg("Terjadi kesalahan saat mengambil data.");
        setRawData([]); // Pastikan tetap array kosong
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const processedData = useMemo(() => {
    // HANDLING DATA KOSONG: Jika rawData kosong, langsung return []
    if (!rawData || rawData.length === 0) return [];

    let filtered = rawData;
    
    // Safety check saat filter tanggal (cegah error jika tanggal invalid di sheet)
    if (startDate) {
      filtered = filtered.filter((item) => item.tanggal && item.tanggal >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((item) => item.tanggal && item.tanggal <= endDate);
    }

    const groupedMap = new Map<string, RiwayatItem>();

    filtered.forEach((item) => {
      // Pastikan field penting ada
      const tgl = item.tanggal || "UNKNOWN-DATE";
      const qr = item.kode_qr || "UNKNOWN-QR";
      const key = `${tgl}_${qr}`;

      if (groupedMap.has(key)) {
        const existing = groupedMap.get(key)!;
        existing.stok_sistem += (item.stok_sistem || 0);
        existing.stok_fisik += (item.stok_fisik || 0);
        existing.selisih += (item.selisih || 0);
        existing.status = existing.selisih === 0 ? "COCOK" : (existing.selisih < 0 ? "KURANG" : "LEBIH");
      } else {
        // Clone object untuk memutus referensi
        groupedMap.set(key, { ...item });
      }
    });

    return Array.from(groupedMap.values()).sort((a, b) => 
        // Fallback sort jika tanggal tidak valid
        (new Date(b.tanggal || 0).getTime()) - (new Date(a.tanggal || 0).getTime())
    );
  }, [rawData, startDate, endDate]);

  const handleExport = () => {
    // HANDLING: Jangan export jika data kosong
    if (processedData.length === 0) return;

    const dataToExport = processedData.map((item) => ({
      "Tanggal": item.tanggal,
      "Kode QR": item.kode_qr,
      "Nama Produk": item.nama_produk,
      "Stok Sistem": item.stok_sistem,
      "Stok Fisik": item.stok_fisik,
      "Selisih": item.selisih,
      "Status": item.status
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat Opname");
    const fileName = `Laporan_Opname_${startDate || "All"}_${endDate || "All"}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Navbar />
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Riwayat Stock Opname</h1>
        
        <Button 
          onClick={handleExport} 
          disabled={loading || processedData.length === 0} // DISABLE jika kosong
          className="bg-green-600 hover:bg-green-700 text-white gap-2 disabled:opacity-50"
        >
          <Download size={16} />
          Export Excel
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 flex gap-4">
        {/* Input Tanggal sama seperti sebelumnya... */}
         <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Dari Tanggal</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Sampai Tanggal</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3">Produk</th>
                <th className="px-6 py-3 text-right">Sistem</th>
                <th className="px-6 py-3 text-right">Fisik (Total)</th>
                <th className="px-6 py-3 text-right">Selisih</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* KONDISI 1: Loading */}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex justify-center items-center gap-2 text-gray-500">
                      <Loader2 className="animate-spin" /> Sedang mengambil data...
                    </div>
                  </td>
                </tr>
              )}

              {/* KONDISI 2: Error Fetching */}
              {!loading && errorMsg && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-red-500 bg-red-50">
                    <div className="flex justify-center items-center gap-2">
                       <AlertCircle size={18}/> {errorMsg}
                    </div>
                  </td>
                </tr>
              )}

              {/* KONDISI 3: Data Kosong (Setelah Loading & Tidak Error) */}
              {!loading && !errorMsg && processedData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <p className="font-medium">Tidak ada data riwayat.</p>
                    <p className="text-xs mt-1">Belum ada opname yang dilakukan atau filter tanggal tidak sesuai.</p>
                  </td>
                </tr>
              )}

              {/* KONDISI 4: Data Ada */}
              {!loading && !errorMsg && processedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                       {/* Safe date formatting */}
                       {row.tanggal && !isNaN(Date.parse(row.tanggal)) 
                         ? format(new Date(row.tanggal), "dd MMMM yyyy", { locale: id }) 
                         : row.tanggal}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{row.nama_produk}</div>
                      <div className="text-xs text-gray-500">{row.kode_qr}</div>
                    </td>
                    <td className="px-6 py-4 text-right">{row.stok_sistem}</td>
                    <td className="px-6 py-4 text-right font-bold text-blue-600">{row.stok_fisik}</td>
                    <td className={`px-6 py-4 text-right font-bold ${
                      row.selisih < 0 ? "text-red-600" : row.selisih > 0 ? "text-green-600" : "text-gray-400"
                    }`}>
                      {row.selisih > 0 ? "+" : ""}{row.selisih}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            row.selisih === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                            {row.selisih === 0 ? "COCOK" : "SELISIH"}
                        </span>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}