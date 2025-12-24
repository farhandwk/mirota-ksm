'use client';

import { useState, useMemo } from 'react';
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
import { Filter, X, ArrowUpDown, Calendar, Download } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HistoryPage() {
  // 1. Fetch Data (TAMBAHKAN productsData)
  const { data: trxData, error } = useSWR('/api/transactions', fetcher);
  const { data: usersData } = useSWR('/api/users', fetcher);
  const { data: deptData } = useSWR('/api/departments', fetcher);
  const { data: productsData } = useSWR('/api/products', fetcher); // <--- Fetch Produk

  // 2. State Filter
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // --- LOGIC LOOKUP NAMA PRODUK (BARU) ---
  const getProductInfo = (qrCode: string) => {
    if (!productsData?.data) return { name: qrCode, qr: qrCode };
    
    // Cari produk yang QR-nya cocok
    const product = productsData.data.find((p: any) => p.qr_code === qrCode);
    
    if (product) {
        return { name: product.name, qr: qrCode };
    }
    // Jika produk terhapus/tidak ketemu, tetap tampilkan QR sebagai nama
    return { name: "Produk Tidak Dikenal", qr: qrCode };
  };

  // 3. Logic UI: Format "Oleh" (Role + Nama)
  const getUserLabel = (picName: string) => {
    if (!usersData?.data) return picName;
    const foundUser = usersData.data.find((u: any) => u.name === picName || u.username === picName);
    
    if (foundUser) {
      return (
        <span className="flex flex-col">
            <span className="font-semibold text-gray-900">{foundUser.name}</span>
            <span className="text-[10px] uppercase tracking-wide text-gray-500">{foundUser.role}</span>
        </span>
      );
    }
    return picName;
  };

  // 4. Logic Filtering
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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy, HH:mm', { locale: id });
    } catch (e) {
      return dateString; 
    }
  };

  // --- 5. EXPORT EXCEL (DIPERBARUI) ---
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

        // Ambil nama produk untuk Excel
        const rawQr = row.qr_code_produk || row.qr_code;
        const prodInfo = getProductInfo(rawQr);

        return {
            "Tanggal Waktu": formatDate(row.date),
            "Tipe": row.type,
            "Nama Produk": prodInfo.name, // Kolom Nama Produk
            "Kode QR": rawQr,             // Kolom QR
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
    <div className="min-h-screen bg-white p-6 md:p-10 font-sans">
        <Navbar/>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#004aad]">Riwayat Transaksi</h1>
                <p className="text-muted-foreground">Log aktivitas keluar masuk barang di gudang.</p>
            </div>
            
            <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-4 py-2 text-sm h-10">
                    Total: {filteredData.length} Data
                </Badge>
                <Button 
                    onClick={handleExport}
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    disabled={!trxData || filteredData.length === 0}
                >
                    <Download className="w-4 h-4" /> Export Excel
                </Button>
            </div>
        </div>

        {/* --- SECTION FILTER --- */}
        <Card className="bg-gray-50 border shadow-sm">
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-500">Urutkan</Label>
                        <Select value={sortOrder} onValueChange={(val: any) => setSortOrder(val)}>
                            <SelectTrigger className="bg-white">
                                <ArrowUpDown className="w-4 h-4 mr-2 text-gray-400"/>
                                <SelectValue placeholder="Urutan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Terbaru (Newest)</SelectItem>
                                <SelectItem value="oldest">Terlama (Oldest)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 lg:col-span-2">
                        <Label className="text-xs font-semibold text-gray-500">Rentang Tanggal</Label>
                        <div className="flex gap-2 items-center">
                            <div className="relative w-full">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input type="date" className="pl-9 bg-white" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            </div>
                            <span className="text-gray-400">-</span>
                            <div className="relative w-full">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input type="date" className="pl-9 bg-white" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-500">Tipe Transaksi</Label>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="bg-white">
                                <Filter className="w-4 h-4 mr-2 text-gray-400"/>
                                <SelectValue placeholder="Tipe" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Semua Tipe</SelectItem>
                                <SelectItem value="IN">Barang Masuk (IN)</SelectItem>
                                <SelectItem value="OUT">Barang Keluar (OUT)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                         <Label className="text-xs font-semibold text-gray-500">Departemen</Label>
                        <Select value={deptFilter} onValueChange={setDeptFilter}>
                            <SelectTrigger className="bg-white">
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
                      <div className="mt-4 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={handleReset} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <X className="w-4 h-4 mr-2"/> Hapus Filter
                        </Button>
                      </div>
                )}
            </CardContent>
        </Card>

        {/* --- TABEL TRANSAKSI --- */}
        <Card className="shadow-sm border-t-4 border-t-[#004aad]">
          <CardHeader>
            <CardTitle>Jurnal Aktivitas</CardTitle>
            <CardDescription>
                Menampilkan data {startDate && endDate ? `dari ${startDate} s/d ${endDate}` : 'terbaru'}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!trxData ? (
              <div className="text-center py-10 text-gray-500">Memuat data log...</div>
            ) : error ? (
              <div className="text-center py-10 text-red-500">Gagal mengambil data.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Tipe</TableHead>
                    {/* Header Tabel Berubah */}
                    <TableHead>Produk</TableHead> 
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Oleh (PIC)</TableHead>
                    <TableHead>Tujuan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                                Tidak ada transaksi yang sesuai filter.
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredData.map((log: any) => {
                            // --- LOOKUP NAMA PRODUK ---
                            const qrCode = log.qr_code_produk || log.qr_code;
                            const productInfo = getProductInfo(qrCode);

                            return (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono text-xs text-gray-500">
                                {formatDate(log.date)}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={log.type === 'IN' ? 'default' : 'destructive'}
                                  className={log.type === 'OUT' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                                >
                                  {log.type}
                                </Badge>
                              </TableCell>
                              
                              {/* --- KOLOM PRODUK (UPDATED) --- */}
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                    {/* Nama Produk (Utama) */}
                                    <span className="text-gray-900 font-semibold">{productInfo.name}</span>
                                    {/* Kode QR (Subtext) */}
                                    <span className="text-xs text-gray-400 font-mono mt-0.5">{productInfo.qr}</span>
                                </div>
                              </TableCell>

                              <TableCell>
                                <span className={`font-bold text-base ${log.type === 'IN' ? 'text-green-600' : 'text-orange-600'}`}>
                                  {log.type === 'IN' ? '+' : '-'}{log.qty}
                                </span>
                              </TableCell>
                              <TableCell>
                                {getUserLabel(log.pic)}
                              </TableCell>
                              <TableCell>
                                {log.dept_id !== '-' ? (
                                   <Badge variant="outline" className="text-[#004aad] border-[#004aad]">
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
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}