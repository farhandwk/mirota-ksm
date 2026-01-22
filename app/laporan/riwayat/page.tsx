'use client';

import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2, AlertCircle, XCircle, CheckCircle, Lock, X, Trash2, ClipboardCheck, History, CalendarDays } from "lucide-react"; 
import { Button } from "../../../components/ui/button"; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Navbar from '../../../components/Navbar'
import { Badge } from "../../../components/ui/badge";

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
  const [rawData, setRawData] = useState<RiwayatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); 
  const [sortOrder, setSortOrder] = useState("newest"); 

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/laporan/riwayat");
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      setRawData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setRawData([]); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- ACTION: APPROVE ---
  const handleApprove = async (item: RiwayatItem) => {
    const confirmMsg = `KONFIRMASI APPROVAL:\n\nProduk: ${item.nama_produk}\nStok Master akan diubah dari ${item.stok_sistem} menjadi ${item.stok_fisik}.\n\nLanjutkan?`;
    if(!confirm(confirmMsg)) return;

    setProcessingId(item.id_opname); 
    try {
        const res = await fetch('/api/laporan/approve', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                id_opname: item.id_opname,
                kode_qr: item.kode_qr,
                stok_baru: item.stok_fisik
            })
        });
        if(res.ok) {
            alert("Berhasil disetujui! Stok master terupdate.");
            fetchData(); 
        } else {
            alert("Gagal memproses.");
        }
    } catch (e) { alert("Error koneksi."); } 
    finally { setProcessingId(null); }
  };

  // --- ACTION: REJECT ---
  const handleReject = async (item: RiwayatItem) => {
    const confirmMsg = `HAPUS PERMINTAAN?\n\nAnda menolak hasil opname: ${item.nama_produk}.\nData laporan ini akan DIHAPUS PERMANEN dari riwayat.\nStok Master tidak akan berubah.\n\nLanjutkan menghapus?`;
    if(!confirm(confirmMsg)) return;

    setProcessingId(item.id_opname);
    try {
        const res = await fetch('/api/laporan/reject', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id_opname: item.id_opname })
        });
        const json = await res.json();
        if(res.ok) {
            alert("Laporan berhasil dihapus.");
            fetchData();
        } else {
            alert(`Gagal menghapus: ${json.message}`);
        }
    } catch (e) { alert("Error koneksi."); } 
    finally { setProcessingId(null); }
  };

  // --- FILTERING ---
  const processedData = useMemo(() => {
    if (!rawData) return [];
    let results = [...rawData];

    if (startDate) results = results.filter((item) => item.tanggal >= startDate);
    if (endDate) results = results.filter((item) => item.tanggal <= endDate);

    if (statusFilter !== "ALL") {
        if (statusFilter === "PENDING") results = results.filter((item) => item.status.includes("PENDING"));
        else if (statusFilter === "APPROVED") results = results.filter((item) => item.status.includes("APPROVED"));
        else if (statusFilter === "REJECTED") results = results.filter((item) => item.status.includes("REJECTED"));
        else results = results.filter((item) => item.status.includes(statusFilter));
    }

    results.sort((a, b) => {
        const dateA = new Date(a.tanggal || 0).getTime();
        const dateB = new Date(b.tanggal || 0).getTime();
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    return results;
  }, [rawData, startDate, endDate, statusFilter, sortOrder]);

  // --- EXPORT ---
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(processedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat");
    XLSX.writeFile(wb, `Opname_Export.xlsx`);
  };

  const handleResetFilter = () => {
      setStartDate(""); setEndDate(""); setStatusFilter("ALL"); setSortOrder("newest");
  };

  return (
    // 1. BACKGROUND GRADIENT KONSISTEN
    <div className="min-h-screen bg-gradient-to-br from-[#004aad]/5 via-white to-blue-50 font-sans pb-20">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 pt-24">
        
        {/* --- HEADER (GLASS STYLE) --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm relative overflow-hidden group">
            {/* Dekorasi BG */}
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <ClipboardCheck className="w-32 h-32 text-[#004aad]" />
            </div>

            <div className="relative z-10">
                <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight flex items-center gap-3">
                    <History className="w-8 h-8 opacity-80"/> Riwayat Stock Opname
                </h1>
                <p className="text-gray-500 mt-1 font-medium">Monitor hasil opname dan persetujuan selisih stok.</p>
            </div>
            
            <Button 
                onClick={handleExport} 
                disabled={loading} 
                className="relative z-10 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 active:scale-95 transition-all font-bold px-6 h-11"
            >
                <Download className="w-4 h-4 mr-2" /> Export Excel
            </Button>
        </div>

        {/* --- FILTER SECTION (GLASS BAR) --- */}
        <div className="bg-white/70 backdrop-blur-md p-5 rounded-xl border border-white/60 shadow-sm sticky top-20 z-20 transition-all">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                
                {/* Urutkan */}
                <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Urutkan</Label>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                        <SelectTrigger className="bg-white/60 border-gray-200 shadow-sm"><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Paling Baru</SelectItem>
                            <SelectItem value="oldest">Paling Lama</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Status Approval</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-white/60 border-gray-200 shadow-sm"><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua Status</SelectItem>
                            <SelectItem value="PENDING">⚠️ Menunggu (Pending)</SelectItem>
                            <SelectItem value="APPROVED">✅ Disetujui (Approved)</SelectItem>
                            <SelectItem value="REJECTED">❌ Ditolak (Rejected)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Tanggal */}
                <div className="space-y-1 lg:col-span-2">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Rentang Tanggal</Label>
                    <div className="flex gap-2 items-center">
                        <div className="relative w-full">
                            <CalendarDays className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input type="date" className="pl-9 bg-white/60 border-gray-200 text-sm shadow-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <span className="text-gray-400 font-bold">-</span>
                        <div className="relative w-full">
                            <CalendarDays className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input type="date" className="pl-9 bg-white/60 border-gray-200 text-sm shadow-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            {(startDate || endDate || statusFilter !== "ALL") && (
                <div className="mt-4 flex justify-end border-t border-gray-100 pt-3">
                    <Button variant="ghost" size="sm" onClick={handleResetFilter} className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors">
                        <X className="w-4 h-4 mr-2"/> Reset Filter
                    </Button>
                </div>
            )}
        </div>

        {/* --- TABEL RIWAYAT (GLASS CONTAINER) --- */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-md overflow-hidden ring-1 ring-white/50">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 backdrop-blur-sm uppercase text-xs text-gray-500 font-bold border-b border-gray-100 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4">Tanggal</th>
                            <th className="px-6 py-4">Produk</th>
                            <th className="px-6 py-4 text-center">Sistem</th>
                            <th className="px-6 py-4 text-center">Fisik</th>
                            <th className="px-6 py-4 text-center">Selisih</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-center w-48">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && (
                            <tr><td colSpan={7} className="px-6 py-20 text-center text-gray-500 flex flex-col items-center"><Loader2 className="w-8 h-8 animate-spin text-[#004aad] mb-2"/> Memuat riwayat...</td></tr>
                        )}
                        {!loading && processedData.length === 0 && (
                            <tr><td colSpan={7} className="px-6 py-20 text-center text-gray-400 font-medium">Tidak ada data riwayat opname.</td></tr>
                        )}
                        
                        {!loading && processedData.map((row, idx) => {
                            const isPending = row.status.includes('PENDING');
                            const isApproved = row.status.includes('APPROVED');
                            const isRejected = row.status.includes('REJECTED');
                            
                            return (
                                <tr key={idx} className={`transition-colors border-b border-gray-50 last:border-0 ${
                                    isPending ? 'bg-yellow-50/40 hover:bg-yellow-50/60' : 
                                    isRejected ? 'bg-gray-50/50 opacity-60 hover:opacity-100' : 
                                    'hover:bg-blue-50/30'
                                }`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono text-xs">
                                        {row.tanggal ? format(new Date(row.tanggal), "dd MMM HH:mm", { locale: id }) : "-"}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800 text-sm">{row.nama_produk}</div>
                                        <div className="text-[10px] bg-gray-100 text-gray-500 font-mono mt-1 px-1.5 py-0.5 rounded w-fit border border-gray-200">
                                            {row.kode_qr}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-500 font-medium">{row.stok_sistem}</td>
                                    <td className="px-6 py-4 text-center font-bold text-gray-900 bg-white/50">{row.stok_fisik}</td>
                                    
                                    <td className="px-6 py-4 text-center">
                                        <Badge variant="outline" className={`font-bold border-0 ${row.selisih < 0 ? "bg-red-100 text-red-600" : row.selisih > 0 ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                                            {row.selisih > 0 ? "+" : ""}{row.selisih}
                                        </Badge>
                                    </td>

                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center justify-center gap-1 w-fit mx-auto ${
                                            isPending ? "bg-yellow-100 text-yellow-700 border-yellow-200 shadow-sm" : 
                                            isApproved ? "bg-green-100 text-green-700 border-green-200 shadow-sm" :
                                            isRejected ? "bg-red-100 text-red-700 border-red-200" :
                                            "bg-gray-100 text-gray-600"
                                        }`}>
                                            {isPending && <AlertCircle size={12}/>}
                                            {isApproved && <CheckCircle size={12}/>}
                                            {isRejected && <XCircle size={12}/>}
                                            {isPending ? "PENDING" : isApproved ? "APPROVED" : isRejected ? "DITOLAK" : row.status}
                                        </span>
                                    </td>

                                    {/* KOLOM AKSI */}
                                    <td className="px-6 py-4 text-center">
                                        {isPending ? (
                                            <div className="flex gap-2 justify-center">
                                                <Button 
                                                    variant="ghost"
                                                    size="sm" 
                                                    disabled={processingId === row.id_opname}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 rounded-full transition-colors"
                                                    onClick={() => handleReject(row)}
                                                    title="Tolak & Hapus"
                                                >
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>

                                                <Button 
                                                    size="sm" 
                                                    disabled={processingId === row.id_opname}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
                                                    onClick={() => handleApprove(row)}
                                                >
                                                    {processingId === row.id_opname ? <Loader2 className="animate-spin w-3 h-3"/> : "Setujui"}
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 flex items-center justify-center gap-1 font-medium">
                                                <Lock size={12}/> Selesai
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>

      </div>
    </div>
  );
}