'use client';

import { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "../../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../../components/ui/select";
import { format } from 'date-fns'; 
import { id } from 'date-fns/locale'; 
import Navbar from "../../components/Navbar"
import { 
    Filter, X, ArrowUpDown, Calendar, Download, History, FileText, Loader2, 
    ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight 
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HistoryPage() {
  // 1. Fetch Data 
  const { data: trxData, error } = useSWR('/api/transactions', fetcher);
  const { data: usersData } = useSWR('/api/users', fetcher);
  const { data: deptData } = useSWR('/api/departments', fetcher);
  const { data: productsData } = useSWR('/api/products', fetcher); 

  // 2. State Filter
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // --- 3. STATE PAGINASI ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Jumlah item per halaman

  // --- LOGIC LOOKUP NAMA PRODUK ---
  const getProductInfo = (qrCode: string) => {
    if (!productsData?.data) return { name: qrCode, qr: qrCode };
    const product = productsData.data.find((p: any) => p.qr_code === qrCode);
    if (product) {
        return { name: product.name, qr: qrCode };
    }
    return { name: "Produk Tidak Dikenal", qr: qrCode };
  };

  // 4. Logic UI: Format "Oleh" (Role + Nama)
  const getUserLabel = (picName: string) => {
    if (!usersData?.data) return picName;
    const foundUser = usersData.data.find((u: any) => u.name === picName || u.username === picName);
    
    if (foundUser) {
      return (
        <span className="flex flex-col">
            <span className="font-semibold text-gray-800 text-sm">{foundUser.name}</span>
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{foundUser.role}</span>
        </span>
      );
    }
    return picName;
  };

  // 5. Logic Filtering
  const filteredData = useMemo(() => {
    if (!trxData?.data) return [];

    let result = [...trxData.data];

    if (typeFilter !== 'ALL') {
      result = result.filter((item) => item.type === typeFilter);
    }
    if (deptFilter !== 'ALL') {
      result = result.filter((item) => item.dept_id === deptFilter);
    }
    if (startDate) {
      result = result.filter((item) => new Date(item.date) >= new Date(startDate));
    }
    if (endDate) {
      const endDateTime = new Date(`${endDate}T23:59:59`);
      result = result.filter((item) => new Date(item.date) <= endDateTime);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [trxData, typeFilter, deptFilter, startDate, endDate, sortOrder]);

  // --- 6. LOGIC PAGINASI ---
  // Reset halaman jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, deptFilter, startDate, endDate, sortOrder]);

  // Hitung total halaman
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Potong data untuk halaman aktif
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);


  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: id });
    } catch (e) {
      return dateString; 
    }
  };

  // --- 7. EXPORT EXCEL ---
  const handleExport = () => {
    if (filteredData.length === 0) {
        alert("Tidak ada data untuk diekspor");
        return;
    }

    const excelData = filteredData.map((row) => {
        let picName = row.pic;
        if (usersData?.data) {
            const foundUser = usersData.data.find((u: any) => u.name === row.pic || u.username === row.pic);
            if (foundUser) picName = `${foundUser.name} (${foundUser.role})`;
        }

        const rawQr = row.qr_code_produk || row.qr_code;
        const prodInfo = getProductInfo(rawQr);

        return {
            "Tanggal Waktu": formatDate(row.date),
            "Tipe": row.type,
            "Nama Produk": prodInfo.name, 
            "Kode QR": rawQr,             
            "Jumlah": row.type === 'IN' ? `+${row.qty}` : `-${row.qty}`,
            "PIC (Petugas)": picName,
            "Departemen": row.dept_id
        };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Transaksi");

    let fileName = "Laporan_Transaksi";
    if (startDate && endDate) {
        fileName += `_${startDate}_sd_${endDate}`;
    } else {
        fileName += `_${new Date().toISOString().split('T')[0]}`;
    }
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const handleReset = () => {
    setSortOrder('newest');
    setTypeFilter('ALL');
    setDeptFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  return (
    // 1. BACKGROUND GRADIENT
    <div className="min-h-screen bg-gradient-to-br from-[#004aad]/5 via-white to-blue-50 font-sans pb-20">
        <Navbar/>
      
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 pt-24">
        
        {/* --- HEADER (GLASS) --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm relative overflow-hidden group">
            {/* Dekorasi BG */}
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <History className="w-32 h-32 text-[#004aad]" />
            </div>

            <div className="relative z-10">
                <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight flex items-center gap-3">
                    <FileText className="w-8 h-8 opacity-80"/> Jurnal Aktivitas
                </h1>
                <p className="text-gray-500 mt-1 font-medium">Log lengkap pergerakan barang masuk dan keluar.</p>
            </div>
            
            <div className="relative z-10 flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end mr-2">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Transaksi</span>
                    <span className="text-2xl font-black text-gray-800 leading-none">{filteredData.length}</span>
                </div>
                <Button 
                    onClick={handleExport}
                    className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/10 transition-all active:scale-95 h-11 px-6 font-bold"
                    disabled={!trxData || filteredData.length === 0}
                >
                    <Download className="w-4 h-4 mr-2" /> Export Excel
                </Button>
            </div>
        </div>

        {/* --- SECTION FILTER (GLASS BAR) --- */}
        <div className="bg-white/70 backdrop-blur-md p-5 rounded-xl border border-white/60 shadow-sm sticky top-20 z-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Urutkan</Label>
                    <Select value={sortOrder} onValueChange={(val: any) => setSortOrder(val)}>
                        <SelectTrigger className="bg-white/50 border-gray-200">
                            <div className="flex items-center gap-2 text-gray-600">
                                <ArrowUpDown className="w-3.5 h-3.5"/>
                                <SelectValue placeholder="Urutan" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Terbaru (Newest)</SelectItem>
                            <SelectItem value="oldest">Terlama (Oldest)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 lg:col-span-2">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Rentang Tanggal</Label>
                    <div className="flex gap-2 items-center">
                        <div className="relative w-full">
                            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input type="date" className="pl-9 bg-white/50 border-gray-200 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <span className="text-gray-400 font-bold">-</span>
                        <div className="relative w-full">
                            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input type="date" className="pl-9 bg-white/50 border-gray-200 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Tipe Transaksi</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="bg-white/50 border-gray-200">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Filter className="w-3.5 h-3.5"/>
                                <SelectValue placeholder="Tipe" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua Tipe</SelectItem>
                            <SelectItem value="IN">Barang Masuk (IN)</SelectItem>
                            <SelectItem value="OUT">Barang Keluar (OUT)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Departemen</Label>
                    <Select value={deptFilter} onValueChange={setDeptFilter}>
                        <SelectTrigger className="bg-white/50 border-gray-200">
                            <SelectValue placeholder="Semua Dept" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua Dept</SelectItem>
                            {deptData?.data?.map((dept: any) => (
                                <SelectItem key={dept.id} value={dept.id}>{dept.nama}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {(typeFilter !== 'ALL' || deptFilter !== 'ALL' || startDate || endDate) && (
                    <div className="mt-4 flex justify-end border-t border-gray-100 pt-3">
                    <Button variant="ghost" size="sm" onClick={handleReset} className="text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <X className="w-4 h-4 mr-2"/> Hapus Filter
                    </Button>
                    </div>
            )}
        </div>

        {/* --- TABEL TRANSAKSI (GLASS CARD) --- */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-md overflow-hidden ring-1 ring-white/50">
          <CardContent className="p-0">
            {!trxData ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-[#004aad]/50"/>
                  <p className="animate-pulse font-medium">Memuat data log...</p>
              </div>
            ) : error ? (
              <div className="text-center py-20 text-red-500">Gagal mengambil data.</div>
            ) : (
                <>
                {/* 1. TABLE CONTENT */}
                <div className="min-h-[400px]">
                    <Table>
                        <TableHeader className="bg-gray-50/50 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-100">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="py-4 pl-6 font-bold text-gray-600">Waktu</TableHead>
                            <TableHead className="py-4 font-bold text-gray-600 text-center">Tipe</TableHead>
                            <TableHead className="py-4 font-bold text-gray-600">Produk</TableHead> 
                            <TableHead className="py-4 font-bold text-gray-600 text-right">Jumlah</TableHead>
                            <TableHead className="py-4 font-bold text-gray-600 pl-8">Oleh (PIC)</TableHead>
                            <TableHead className="py-4 font-bold text-gray-600 pr-6 text-right">Tujuan</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-16 text-gray-400">
                                        <History className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                                        Tidak ada transaksi yang sesuai filter.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedData.map((log: any) => {
                                    const qrCode = log.qr_code_produk || log.qr_code;
                                    const productInfo = getProductInfo(qrCode);
                                    const isIN = log.type === 'IN';

                                    return (
                                    <TableRow key={log.id} className="hover:bg-blue-50/40 transition-colors border-b border-gray-50 last:border-0 group">
                                    <TableCell className="pl-6 py-4">
                                        <div className="text-xs font-mono text-gray-500 font-medium">
                                            {formatDate(log.date)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge 
                                        variant="outline"
                                        className={`border-0 px-3 py-1 font-bold ${isIN ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}
                                        >
                                        {isIN ? <ArrowDownLeft className="w-3 h-3 mr-1"/> : <ArrowUpRight className="w-3 h-3 mr-1"/>}
                                        {log.type}
                                        </Badge>
                                    </TableCell>
                                    
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-gray-900 font-bold text-sm group-hover:text-[#004aad] transition-colors">{productInfo.name}</span>
                                            <span className="text-[10px] text-gray-400 font-mono mt-0.5 bg-gray-100 px-1.5 py-0.5 rounded w-fit border border-gray-200">
                                                {productInfo.qr}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <span className={`font-bold text-base ${isIN ? 'text-green-600' : 'text-orange-600'}`}>
                                        {isIN ? '+' : '-'}{log.qty}
                                        </span>
                                    </TableCell>
                                    <TableCell className="pl-8">
                                        {getUserLabel(log.pic)}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        {log.dept_id !== '-' ? (
                                        <Badge variant="outline" className="bg-white border-blue-200 text-blue-700 font-medium shadow-sm">
                                            {log.dept_id}
                                        </Badge>
                                        ) : (
                                        <span className="text-gray-300">-</span>
                                        )}
                                    </TableCell>
                                    </TableRow>
                                )})
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* 2. PAGINATION CONTROLS (FOOTER) */}
                {filteredData.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                        <div className="text-sm text-gray-500">
                            Menampilkan <b>{(currentPage - 1) * itemsPerPage + 1}</b> - <b>{Math.min(currentPage * itemsPerPage, filteredData.length)}</b> dari <b>{filteredData.length}</b> transaksi
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            
                            <span className="text-sm font-medium px-2">
                                Hal {currentPage} / {totalPages}
                            </span>

                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
                </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}