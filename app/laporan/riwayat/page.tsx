"use client";

import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2, AlertCircle, XCircle, CheckCircle, Lock, X, Trash2 } from "lucide-react"; 
import { Button } from "../../../components/ui/button"; 
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
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
  const [rawData, setRawData] = useState<RiwayatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null); // Ganti nama state agar general

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

  // --- ACTION: REJECT (BARU) ---
  const handleReject = async (item: RiwayatItem) => {
    // Pesan konfirmasi yang lebih keras karena sifatnya destruktif (menghapus)
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
            fetchData(); // Refresh tabel agar baris yang dihapus hilang
        } else {
            alert(`Gagal menghapus: ${json.message}`);
        }
    } catch (e) { 
        alert("Error koneksi."); 
    } finally { 
        setProcessingId(null); 
    }
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
    <div className="min-h-screen bg-white p-6 md:p-10 font-sans">
      <Navbar />
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#004aad]">Riwayat Stock Opname</h1>
            <p className="text-muted-foreground">Monitor persetujuan selisih stok.</p>
          </div>
          <Button onClick={handleExport} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white gap-2">
            <Download size={16} /> Export Excel
          </Button>
        </div>

        <Card className="bg-gray-50 border shadow-sm">
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-500">Urutkan</Label>
                        <Select value={sortOrder} onValueChange={setSortOrder}>
                            <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Paling Baru</SelectItem>
                                <SelectItem value="oldest">Paling Lama</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-500">Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Semua</SelectItem>
                                <SelectItem value="PENDING">⚠️ Menunggu Approval</SelectItem>
                                <SelectItem value="APPROVED">✅ Disetujui</SelectItem>
                                <SelectItem value="REJECTED">❌ Ditolak</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                        <Label className="text-xs font-semibold text-gray-500">Tanggal</Label>
                        <div className="flex gap-2 items-center">
                            <Input type="date" className="bg-white" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            <span className="text-gray-400">-</span>
                            <Input type="date" className="bg-white" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                    </div>
                </div>
                {(startDate || endDate || statusFilter !== "ALL") && (
                      <div className="mt-4 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={handleResetFilter} className="text-red-500 hover:bg-red-50">
                            <X className="w-4 h-4 mr-2"/> Reset
                        </Button>
                      </div>
                )}
            </CardContent>
        </Card>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 uppercase text-xs text-gray-500 font-semibold border-b">
                <tr>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Produk</th>
                  <th className="px-6 py-3 text-center">Sistem</th>
                  <th className="px-6 py-3 text-center">Fisik</th>
                  <th className="px-6 py-3 text-center">Selisih</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-center w-48">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading && <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2"/> Loading...</td></tr>}
                
                {!loading && processedData.map((row, idx) => {
                    const isPending = row.status.includes('PENDING');
                    const isApproved = row.status.includes('APPROVED');
                    const isRejected = row.status.includes('REJECTED');
                    
                    return (
                        <tr key={idx} className={`hover:bg-gray-50 transition-colors ${isPending ? 'bg-yellow-50/30' : isRejected ? 'bg-gray-100 opacity-70' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                             {row.tanggal ? format(new Date(row.tanggal), "dd MMM HH:mm", { locale: id }) : "-"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{row.nama_produk}</div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">{row.kode_qr}</div>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-600">{row.stok_sistem}</td>
                          <td className="px-6 py-4 text-center font-bold text-gray-900">{row.stok_fisik}</td>
                          
                          <td className={`px-6 py-4 text-center font-bold ${row.selisih < 0 ? "text-red-600" : row.selisih > 0 ? "text-blue-600" : "text-gray-400"}`}>
                            {row.selisih > 0 ? "+" : ""}{row.selisih}
                          </td>

                          <td className="px-6 py-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center justify-center gap-1 w-fit mx-auto ${
                                  isPending ? "bg-yellow-100 text-yellow-700 border-yellow-200" : 
                                  isApproved ? "bg-green-100 text-green-700 border-green-200" :
                                  isRejected ? "bg-red-100 text-red-700 border-red-200" :
                                  "bg-gray-100 text-gray-600"
                              }`}>
                                  {isPending && <AlertCircle size={12}/>}
                                  {isApproved && <CheckCircle size={12}/>}
                                  {isRejected && <XCircle size={12}/>}
                                  {isPending ? "PENDING" : isApproved ? "APPROVED" : isRejected ? "DITOLAK" : row.status}
                              </span>
                          </td>

                          {/* KOLOM AKSI DENGAN DUA TOMBOL */}
                          <td className="px-6 py-4 text-center">
                              {isPending ? (
                                  <div className="flex gap-2 justify-center">
                                      {/* Tombol Reject */}
                                      <Button 
                                        variant="outline"
                                        size="sm" 
                                        disabled={processingId === row.id_opname}
                                        className="text-red-600 border-red-200 hover:bg-red-50 h-8 px-3"
                                        onClick={() => handleReject(row)}
                                        title="Tolak & Hapus Laporan"
                                      ><Trash2/></Button>

                                      {/* Tombol Approve */}
                                      <Button 
                                        size="sm" 
                                        disabled={processingId === row.id_opname}
                                        className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3"
                                        onClick={() => handleApprove(row)}
                                      >
                                        {processingId === row.id_opname ? <Loader2 className="animate-spin w-3 h-3"/> : "Setujui"}
                                      </Button>
                                  </div>
                              ) : (
                                  <span className="text-xs text-gray-400 flex items-center justify-center gap-1">
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
        </div>
      </div>
    </div>
  );
}