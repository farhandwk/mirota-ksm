"use client";

import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2, AlertCircle, Filter, Calendar, ArrowUpDown, X } from "lucide-react"; 
import { Button } from "../../../components/ui/button"; 
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../../../components/ui/select";
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
  status: string; // 'COCOK' | 'LEBIH' | 'KURANG'
}

export default function HalamanRiwayatOpname() {
  const [rawData, setRawData] = useState<RiwayatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- STATE FILTER ---
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, COCOK, LEBIH, KURANG
  const [sortOrder, setSortOrder] = useState("newest"); // newest, oldest

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/laporan/riwayat");
        if (!res.ok) throw new Error("Gagal terhubung ke server");
        const data = await res.json();

        if (Array.isArray(data)) {
          setRawData(data);
        } else {
          console.error("Format data salah:", data);
          setRawData([]); 
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setErrorMsg("Terjadi kesalahan saat mengambil data.");
        setRawData([]); 
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- LOGIKA FILTERING & GROUPING ---
  const processedData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    // 1. Grouping Data (Gabungkan jika ada QR sama di tanggal sama)
    const groupedMap = new Map<string, RiwayatItem>();

    rawData.forEach((item) => {
      const tgl = item.tanggal || "UNKNOWN-DATE";
      const qr = item.kode_qr || "UNKNOWN-QR";
      const key = `${tgl}_${qr}`;

      if (groupedMap.has(key)) {
        const existing = groupedMap.get(key)!;
        existing.stok_sistem += (item.stok_sistem || 0);
        existing.stok_fisik += (item.stok_fisik || 0);
        existing.selisih += (item.selisih || 0);
        // Recalculate status
        existing.status = existing.selisih === 0 ? "COCOK" : (existing.selisih < 0 ? "KURANG" : "LEBIH");
      } else {
        // Kalkulasi status awal
        const status = item.selisih === 0 ? "COCOK" : (item.selisih < 0 ? "KURANG" : "LEBIH");
        groupedMap.set(key, { ...item, status });
      }
    });

    let results = Array.from(groupedMap.values());

    // 2. Filter Range Tanggal
    if (startDate) {
      results = results.filter((item) => item.tanggal >= startDate);
    }
    if (endDate) {
      results = results.filter((item) => item.tanggal <= endDate);
    }

    // 3. Filter Status (Tipe)
    if (statusFilter !== "ALL") {
        results = results.filter((item) => item.status === statusFilter);
    }

    // 4. Sorting
    results.sort((a, b) => {
        const dateA = new Date(a.tanggal || 0).getTime();
        const dateB = new Date(b.tanggal || 0).getTime();
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return results;
  }, [rawData, startDate, endDate, statusFilter, sortOrder]);

  const handleExport = () => {
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

  const handleResetFilter = () => {
      setStartDate("");
      setEndDate("");
      setStatusFilter("ALL");
      setSortOrder("newest");
  };

  return (
    <div className="min-h-screen bg-white p-6 md:p-10 font-sans">
      <Navbar />
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#004aad]">Riwayat Stock Opname</h1>
            <p className="text-muted-foreground">Arsip laporan perhitungan fisik stok gudang.</p>
          </div>
          
          <Button 
            onClick={handleExport} 
            disabled={loading || processedData.length === 0} 
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            <Download size={16} /> Export Excel
          </Button>
        </div>

        {/* --- SECTION FILTER BARU --- */}
        <Card className="bg-gray-50 border shadow-sm">
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    
                    {/* 1. Sort Order */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-500">Urutkan Tanggal</Label>
                        <Select value={sortOrder} onValueChange={setSortOrder}>
                            <SelectTrigger className="bg-white">
                                <ArrowUpDown className="w-4 h-4 mr-2 text-gray-400"/>
                                <SelectValue placeholder="Urutan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Paling Baru</SelectItem>
                                <SelectItem value="oldest">Paling Lama</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 2. Filter Status / Tipe */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-500">Status Opname</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-white">
                                <Filter className="w-4 h-4 mr-2 text-gray-400"/>
                                <SelectValue placeholder="Semua Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Semua Status</SelectItem>
                                <SelectItem value="COCOK">Cocok (Selisih 0)</SelectItem>
                                <SelectItem value="KURANG">Kurang (Minus)</SelectItem>
                                <SelectItem value="LEBIH">Lebih (Plus)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 3. Range Tanggal */}
                    <div className="space-y-2 lg:col-span-2">
                        <Label className="text-xs font-semibold text-gray-500">Rentang Tanggal</Label>
                        <div className="flex gap-2 items-center">
                            <div className="relative w-full">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input 
                                    type="date" 
                                    className="pl-9 bg-white"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <span className="text-gray-400">-</span>
                            <div className="relative w-full">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input 
                                    type="date" 
                                    className="pl-9 bg-white"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tombol Reset Filter */}
                {(startDate || endDate || statusFilter !== "ALL" || sortOrder !== "newest") && (
                     <div className="mt-4 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={handleResetFilter} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <X className="w-4 h-4 mr-2"/> Hapus Filter
                        </Button>
                     </div>
                )}
            </CardContent>
        </Card>

        {/* TABEL DATA */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 uppercase text-xs text-gray-500 font-semibold border-b">
                <tr>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Produk</th>
                  <th className="px-6 py-3 text-right">Sistem</th>
                  <th className="px-6 py-3 text-right">Fisik</th>
                  <th className="px-6 py-3 text-right">Selisih</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex justify-center items-center gap-2 text-gray-500">
                        <Loader2 className="animate-spin" /> Sedang mengambil data...
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && errorMsg && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-red-500 bg-red-50">
                      <div className="flex justify-center items-center gap-2">
                         <AlertCircle size={18}/> {errorMsg}
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && !errorMsg && processedData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <p className="font-medium">Tidak ada data riwayat.</p>
                      <p className="text-xs mt-1">Coba sesuaikan filter tanggal atau status Anda.</p>
                    </td>
                  </tr>
                )}

                {!loading && !errorMsg && processedData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                         {row.tanggal && !isNaN(Date.parse(row.tanggal)) 
                           ? format(new Date(row.tanggal), "dd MMM yyyy", { locale: id }) 
                           : row.tanggal}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{row.nama_produk}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{row.kode_qr}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">{row.stok_sistem}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">{row.stok_fisik}</td>
                      
                      {/* Kolom Selisih Warna-warni */}
                      <td className={`px-6 py-4 text-right font-bold ${
                        row.selisih < 0 ? "text-red-600" : row.selisih > 0 ? "text-blue-600" : "text-gray-400"
                      }`}>
                        {row.selisih > 0 ? "+" : ""}{row.selisih}
                      </td>

                      {/* Kolom Status Badge */}
                      <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                              row.status === "COCOK" ? "bg-green-100 text-green-700 border-green-200" : 
                              row.status === "KURANG" ? "bg-red-100 text-red-700 border-red-200" :
                              "bg-blue-100 text-blue-700 border-blue-200"
                          }`}>
                              {row.status}
                          </span>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}