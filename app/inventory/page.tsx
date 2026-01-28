'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import QRCode from 'react-qr-code';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "../../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import Navbar from "../../components/Navbar"
import { 
    Search, Filter, X, Trash2, Pencil, Save, Loader2, Plus, 
    MoreHorizontal, Package, Box, Layers, Download, 
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight // Icon Paginasi
} from "lucide-react";

import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator 
} from "../../components/ui/dropdown-menu";

// --- UTILITY: DEBOUNCE HOOK ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function InventoryPage() {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedQrData, setSelectedQrData] = useState<{code: string, name: string} | null>(null);
  
  const { data, error, mutate } = useSWR('/api/products', fetcher);
  const { data: unitData } = useSWR('/api/units', fetcher);
  const { data: deptData } = useSWR('/api/departments', fetcher);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const debouncedSearch = useDebounce(searchQuery, 500); 

  // --- STATE PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Tampilkan 10 item per halaman

  // Create State
  const [isCreateOpen, setIsCreateOpen] = useState(false); 
  const [formData, setFormData] = useState({
    nama_produk: '',
    id_departemen: '',
    satuan: 'PCS'
  });

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // --- LOGIC FILTER ---
  const filteredProducts = useMemo(() => {
    if (!data?.data) return [];
    
    // Reset halaman ke 1 jika filter berubah
    // (Note: Sebaiknya dilakukan di useEffect, tapi disini logic filter berjalan setiap render)
    
    return data.data.filter((item: any) => {
      const matchDept = selectedDeptFilter === 'ALL' || item.department_id === selectedDeptFilter;
      const query = debouncedSearch.toLowerCase();
      const matchSearch = 
        item.name.toLowerCase().includes(query) || 
        (item.qr_code && item.qr_code.toLowerCase().includes(query));
      return matchDept && matchSearch;
    });
  }, [data, selectedDeptFilter, debouncedSearch]);

  // --- EFFECT: RESET PAGE ON FILTER CHANGE ---
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDeptFilter, debouncedSearch]);

  // --- LOGIC PAGINATION ---
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage]);


  // --- ACTIONS ---
  async function handleSubmit() {
    if (!formData.nama_produk || !formData.id_departemen) {
      alert("Mohon lengkapi data produk");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormData({ nama_produk: '', id_departemen: '', satuan: 'PCS' }); 
        setIsCreateOpen(false); 
        mutate(); 
      } else {
        alert("Gagal menyimpan data.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus produk "${name}"? Data yang dihapus tidak bisa dikembalikan.`)) return;
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      if (res.ok) mutate();
      else alert("Gagal menghapus.");
    } catch (error) { alert("Error koneksi"); } 
    finally { setIsDeleting(null); }
  }

  const openEditModal = (product: any) => {
    setEditData({
      id: product.id,
      nama_produk: product.name,
      id_departemen: product.department_id,
      satuan: product.unit,
      stok: product.stock 
    });
    setIsEditOpen(true);
  };

  async function handleUpdate() {
    setIsUpdating(true);
    try {
        const res = await fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editData),
        });
        if (res.ok) {
            setIsEditOpen(false);
            setEditData(null);
            mutate();
        } else alert("Gagal update");
    } catch (error) { alert("Error"); } 
    finally { setIsUpdating(false); }
  }

  const handleResetFilter = () => {
    setSearchQuery('');
    setSelectedDeptFilter('ALL');
  };

  const handleDownloadQR = (qrCode: string, productName: string) => {
    const svg = document.getElementById(`qr-svg-${qrCode}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 40; 
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20); 
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR-${productName.replace(/\s+/g, '-')}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const openQrModal = (item: any) => {
    setSelectedQrData({ code: item.qr_code, name: item.name });
    setIsQrModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#004aad]/5 via-white to-blue-50 font-sans pb-20">
      <Navbar/>
      
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 pt-24">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <Package className="w-32 h-32 text-[#004aad]" />
            </div>
            <div className="relative z-10">
                <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight flex items-center gap-3">
                    <Layers className="w-8 h-8 opacity-80"/> Master Data Produk
                </h1>
                <p className="text-gray-500 mt-1 font-medium">Kelola katalog barang, cetak label, dan satuan unit.</p>
            </div>
            <Button 
                onClick={() => setIsCreateOpen(!isCreateOpen)} 
                className={`relative z-10 ${isCreateOpen ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200' : 'bg-[#004aad] hover:bg-blue-900 text-white'} shadow-lg shadow-blue-900/10 transition-all duration-300 h-11 px-6`}
                variant={isCreateOpen ? "outline" : "default"}
            >
                {isCreateOpen ? <X className="w-4 h-4 mr-2"/> : <Plus className="w-4 h-4 mr-2"/>}
                {isCreateOpen ? 'Batal Tambah' : 'Tambah Produk Baru'}
            </Button>
        </div>

        {/* --- FORM CREATE --- */}
        {isCreateOpen && (
            <Card className="border-0 border-l-4 border-l-[#004aad] shadow-xl animate-in slide-in-from-top-5 fade-in duration-500 bg-white/80 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="text-[#004aad] flex items-center gap-2"><Package className="w-5 h-5"/> Input Produk Baru</CardTitle>
                    <CardDescription>Sistem akan otomatis men-generate QR Code unik.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div className="space-y-2">
                            <Label>Nama Produk</Label>
                            <Input placeholder="Contoh: Kertas A4 80gr" value={formData.nama_produk} onChange={(e) => setFormData({...formData, nama_produk: e.target.value})} className="focus-visible:ring-[#004aad] bg-white/50"/>
                        </div>
                        <div className="space-y-2">
                            <Label>Departemen</Label>
                            <Select value={formData.id_departemen} onValueChange={(val) => setFormData({...formData, id_departemen: val})}>
                                <SelectTrigger className="bg-white/50"><SelectValue placeholder="Pilih Dept..." /></SelectTrigger>
                                <SelectContent>
                                    {deptData?.data?.map((dept: any) => (<SelectItem key={dept.id} value={dept.id}>{dept.nama}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Satuan</Label>
                            <Select value={formData.satuan} onValueChange={(val) => setFormData({...formData, satuan: val})}>
                                <SelectTrigger className="bg-white/50"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                <SelectContent>
                                    {unitData?.data?.map((u: any) => (<SelectItem key={u.id} value={u.nama}>{u.nama}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleSubmit} disabled={isLoading} className="w-full bg-[#004aad] hover:bg-blue-800 font-bold shadow-md">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>} Simpan
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )}

        {/* --- TOOLBAR FILTER --- */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between bg-white/70 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-sm sticky top-20 z-20 transition-all">
            <div className="relative w-full lg:w-96 group">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-[#004aad] transition-colors" />
                <Input placeholder="Cari nama produk atau scan QR..." className="pl-10 bg-white/60 border-gray-200 focus:bg-white transition-all shadow-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
            </div>
            <div className="flex gap-2 w-full lg:w-auto items-center">
                <div className="w-48">
                    <Select value={selectedDeptFilter} onValueChange={setSelectedDeptFilter}>
                        <SelectTrigger className="bg-white/60 border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 text-gray-600"><Filter className="w-3.5 h-3.5"/><SelectValue placeholder="Semua Dept" /></div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua Departemen</SelectItem>
                            {deptData?.data?.map((dept: any) => (<SelectItem key={dept.id} value={dept.id}>{dept.nama}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                {(searchQuery || selectedDeptFilter !== 'ALL') && (
                    <Button variant="ghost" onClick={handleResetFilter} size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors" title="Reset Filter"><X className="w-4 h-4" /></Button>
                )}
            </div>
        </div>

        {/* --- TABEL DATA --- */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-md overflow-hidden ring-1 ring-white/50">
          <CardContent className="p-0">
            {!data ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-[#004aad]/50"/>
                  <p className="animate-pulse font-medium">Memuat katalog produk...</p>
              </div>
            ) : (
                <>
                {/* 1. TABLE CONTENT */}
                <div className="min-h-[400px]"> 
                    <Table>
                        <TableHeader className="bg-gray-50/50 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-100">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[100px] pl-6 py-4 font-bold text-gray-600">QR Preview</TableHead>
                                <TableHead className="py-4 font-bold text-gray-600">Informasi Produk</TableHead>
                                <TableHead className="py-4 font-bold text-gray-600 text-center">Stok</TableHead>
                                <TableHead className="py-4 font-bold text-gray-600">Lokasi</TableHead>
                                <TableHead className="text-right pr-6 py-4 font-bold text-gray-600">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20 text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Box className="w-16 h-16 opacity-20"/>
                                            <p className="font-medium">Tidak ada produk yang sesuai filter.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedProducts.map((item: any) => (
                                <TableRow key={item.id} className="hover:bg-blue-50/40 transition-colors group border-b border-gray-50 last:border-0">
                                    <TableCell className="pl-6 py-4">
                                        <div className="relative group w-fit cursor-pointer transition-all duration-300 hover:scale-105" onClick={() => openQrModal(item)}>
                                            <div className="bg-white p-1.5 border border-gray-100 rounded-lg shadow-sm">
                                                <QRCode id={`qr-svg-${item.qr_code}`} value={item.qr_code} size={48} level="M" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-bold text-gray-800 text-base">{item.name}</div>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-500 font-mono border border-gray-200">{item.qr_code}</Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={`text-sm px-3 py-1 font-bold shadow-sm ${item.stock < 10 ? 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`} variant="outline">
                                            {item.stock} {item.unit}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
                                            <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><Box className="w-3.5 h-3.5"/></div>
                                            {item.department_id}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="hover:bg-white hover:shadow-sm transition-all rounded-full h-8 w-8"><MoreHorizontal className="w-4 h-4 text-gray-500"/></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl shadow-xl border-gray-100">
                                                <DropdownMenuLabel className="text-xs text-gray-400 font-normal uppercase tracking-wider ml-1">Aksi Produk</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-gray-100 my-1"/>
                                                <DropdownMenuItem onClick={() => openEditModal(item)} className="cursor-pointer rounded-lg hover:bg-blue-50 focus:bg-blue-50 py-2">
                                                    <Pencil className="w-4 h-4 mr-2 text-blue-600"/> <span className="font-medium text-gray-700">Edit Data</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDownloadQR(item.qr_code, item.name)} className="cursor-pointer rounded-lg hover:bg-gray-50 focus:bg-gray-50 py-2">
                                                    <Download className="w-4 h-4 mr-2 text-gray-600"/> <span className="font-medium text-gray-700">Download QR</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-gray-100 my-1"/>
                                                <DropdownMenuItem onClick={() => handleDelete(item.id, item.name)} className="text-red-600 cursor-pointer rounded-lg hover:bg-red-50 focus:bg-red-50 py-2 focus:text-red-600">
                                                    <Trash2 className="w-4 h-4 mr-2"/> <span className="font-medium">Hapus Produk</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* 2. PAGINATION CONTROLS */}
                {filteredProducts.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                        <div className="text-sm text-gray-500">
                            Menampilkan <b>{(currentPage - 1) * itemsPerPage + 1}</b> - <b>{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</b> dari <b>{filteredProducts.length}</b> produk
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
                                Halaman {currentPage} / {totalPages}
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

      {/* --- MODAL EDIT --- */}
      {isEditOpen && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 border border-white/50">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/50">
                    <h3 className="font-bold text-lg text-[#004aad] flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-lg"><Pencil className="w-4 h-4"/></div> Edit Produk
                    </h3>
                    <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-all"><X className="w-5 h-5"/></button>
                </div>
                <div className="p-6 space-y-5">
                    <div className="space-y-2">
                        <Label className="text-gray-600 font-medium">Nama Produk</Label>
                        <Input value={editData.nama_produk} onChange={(e) => setEditData({...editData, nama_produk: e.target.value})} className="focus-visible:ring-[#004aad] bg-gray-50 border-gray-200"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-gray-600 font-medium">Departemen</Label>
                            <Select value={editData.id_departemen} onValueChange={(val) => setEditData({...editData, id_departemen: val})}>
                                <SelectTrigger className="bg-gray-50 border-gray-200"><SelectValue /></SelectTrigger>
                                <SelectContent>{deptData?.data?.map((dept: any) => (<SelectItem key={dept.id} value={dept.id}>{dept.nama}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-600 font-medium">Satuan</Label>
                            <Select value={editData.satuan} onValueChange={(val) => setEditData({...editData, satuan: val})}>
                                <SelectTrigger className="bg-gray-50 border-gray-200"><SelectValue /></SelectTrigger>
                                <SelectContent>{unitData?.data?.map((u: any) => (<SelectItem key={u.id} value={u.nama}>{u.nama}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3 items-start">
                        <Box className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"/>
                        <div className="text-xs text-blue-700 leading-relaxed"><p className="font-bold mb-1 uppercase tracking-wide">Info Stok</p>Stok saat ini: <b className="text-sm">{editData.stok}</b>.<br/> Perubahan jumlah stok hanya dapat dilakukan melalui menu Transaksi atau Stock Opname.</div>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-gray-200 text-gray-600 hover:bg-white hover:text-gray-800">Batal</Button>
                    <Button onClick={handleUpdate} disabled={isUpdating} className="bg-[#004aad] hover:bg-blue-900 text-white shadow-lg shadow-blue-900/20">{isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} Simpan Perubahan</Button>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL BESAR PREVIEW QR --- */}
      {isQrModalOpen && selectedQrData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsQrModalOpen(false)}>
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-300 relative border border-white/20" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setIsQrModalOpen(false)} className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="space-y-1"><h3 className="text-xl font-bold text-gray-800">QR Code Produk</h3><p className="text-sm text-gray-500">{selectedQrData.name}</p></div>
                    <div className="p-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl shadow-inner"><QRCode value={selectedQrData.code} size={200} level="H" /></div>
                    <div className="w-full space-y-3">
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-[#004aad] font-mono text-lg font-bold tracking-wider">{selectedQrData.code}</div>
                        <Button className="w-full bg-[#004aad] hover:bg-blue-900 text-white shadow-lg shadow-blue-900/20 font-bold h-12 rounded-xl" onClick={() => handleDownloadQR(selectedQrData.code, selectedQrData.name)}><Download className="w-5 h-5 mr-2" /> Download Gambar QR</Button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}