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
    MoreHorizontal, QrCode, Package, Box, Layers 
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
  const { data, error, mutate } = useSWR('/api/products', fetcher);
  const { data: unitData } = useSWR('/api/units', fetcher);
  const { data: deptData } = useSWR('/api/departments', fetcher);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const debouncedSearch = useDebounce(searchQuery, 500); 

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
    return data.data.filter((item: any) => {
      const matchDept = selectedDeptFilter === 'ALL' || item.department_id === selectedDeptFilter;
      const query = debouncedSearch.toLowerCase();
      const matchSearch = 
        item.name.toLowerCase().includes(query) || 
        (item.qr_code && item.qr_code.toLowerCase().includes(query));
      return matchDept && matchSearch;
    });
  }, [data, selectedDeptFilter, debouncedSearch]);

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

  return (
    // 1. BACKGROUND GRADIENT KONSISTEN
    <div className="min-h-screen bg-gradient-to-br from-[#004aad]/5 via-white to-blue-50 font-sans pb-20">
      <Navbar/>
      
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 pt-24">
        
        {/* --- HEADER (GLASS STYLE) --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm relative overflow-hidden group">
            {/* Dekorasi Background */}
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

        {/* --- FORM CREATE (COLLAPSIBLE GLASS CARD) --- */}
        {isCreateOpen && (
            <Card className="border-0 border-l-4 border-l-[#004aad] shadow-xl animate-in slide-in-from-top-5 fade-in duration-500 bg-white/80 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="text-[#004aad] flex items-center gap-2">
                        <Package className="w-5 h-5"/> Input Produk Baru
                    </CardTitle>
                    <CardDescription>Sistem akan otomatis men-generate QR Code unik untuk produk ini.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                        <Label>Nama Produk</Label>
                        <Input 
                        placeholder="Contoh: Kertas A4 80gr" 
                        value={formData.nama_produk}
                        onChange={(e) => setFormData({...formData, nama_produk: e.target.value})}
                        className="focus-visible:ring-[#004aad] bg-white/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Departemen</Label>
                        <Select 
                        value={formData.id_departemen} 
                        onValueChange={(val) => setFormData({...formData, id_departemen: val})}
                        >
                        <SelectTrigger className="bg-white/50"><SelectValue placeholder="Pilih Dept..." /></SelectTrigger>
                        <SelectContent>
                            {deptData?.data?.map((dept: any) => (
                                <SelectItem key={dept.id} value={dept.id}>{dept.nama}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Satuan</Label>
                        <Select 
                        value={formData.satuan} 
                        onValueChange={(val) => setFormData({...formData, satuan: val})}
                        >
                        <SelectTrigger className="bg-white/50"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                        <SelectContent>
                            {unitData?.data?.map((u: any) => (
                                <SelectItem key={u.id} value={u.nama}>{u.nama}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleSubmit} disabled={isLoading} className="w-full bg-[#004aad] hover:bg-blue-800 font-bold shadow-md">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>}
                        Simpan
                    </Button>
                    </div>
                </CardContent>
            </Card>
        )}

        {/* --- TOOLBAR FILTER (FLOATING GLASS BAR) --- */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between bg-white/70 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-sm sticky top-20 z-20 transition-all">
            {/* Search Bar */}
            <div className="relative w-full lg:w-96 group">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-[#004aad] transition-colors" />
                <Input 
                    placeholder="Cari nama produk atau scan QR..." 
                    className="pl-10 bg-white/60 border-gray-200 focus:bg-white transition-all shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Filter Dept */}
            <div className="flex gap-2 w-full lg:w-auto items-center">
                <div className="w-48">
                    <Select value={selectedDeptFilter} onValueChange={setSelectedDeptFilter}>
                        <SelectTrigger className="bg-white/60 border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Filter className="w-3.5 h-3.5"/>
                                <SelectValue placeholder="Semua Dept" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua Departemen</SelectItem>
                            {deptData?.data?.map((dept: any) => (
                                <SelectItem key={dept.id} value={dept.id}>{dept.nama}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                {(searchQuery || selectedDeptFilter !== 'ALL') && (
                    <Button variant="ghost" onClick={handleResetFilter} size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors" title="Reset Filter">
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>

        {/* --- TABEL DATA (GLASS CARD CONTAINER) --- */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-md overflow-hidden ring-1 ring-white/50">
          <CardContent className="p-0">
            {!data ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-[#004aad]/50"/>
                  <p className="animate-pulse font-medium">Memuat katalog produk...</p>
              </div>
            ) : (
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
                    {filteredProducts.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-20 text-gray-400">
                                <div className="flex flex-col items-center gap-2">
                                    <Box className="w-16 h-16 opacity-20"/>
                                    <p className="font-medium">Tidak ada produk yang sesuai filter.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredProducts.map((item: any) => (
                        <TableRow key={item.id} className="hover:bg-blue-50/40 transition-colors group border-b border-gray-50 last:border-0">
                            {/* Kolom QR */}
                            <TableCell className="pl-6 py-4">
                                <div className="bg-white p-1.5 border border-gray-100 rounded-lg shadow-sm w-fit group-hover:scale-105 transition-transform duration-300 group-hover:shadow-md">
                                    <QRCode value={item.qr_code} size={48} level="M" />
                                </div>
                            </TableCell>
                            
                            {/* Kolom Info */}
                            <TableCell>
                                <div className="font-bold text-gray-800 text-base">{item.name}</div>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-500 font-mono border border-gray-200">
                                        {item.qr_code}
                                    </Badge>
                                </div>
                            </TableCell>

                            {/* Kolom Stok */}
                            <TableCell className="text-center">
                                <Badge className={`text-sm px-3 py-1 font-bold shadow-sm ${item.stock < 10 ? 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`} variant="outline">
                                    {item.stock} {item.unit}
                                </Badge>
                            </TableCell>

                            {/* Kolom Lokasi */}
                            <TableCell>
                                <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
                                    <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <Box className="w-3.5 h-3.5"/>
                                    </div>
                                    {item.department_id}
                                </div>
                            </TableCell>

                            {/* Kolom Aksi */}
                            <TableCell className="text-right pr-6">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="hover:bg-white hover:shadow-sm transition-all rounded-full h-8 w-8">
                                            <MoreHorizontal className="w-4 h-4 text-gray-500"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl shadow-xl border-gray-100">
                                        <DropdownMenuLabel className="text-xs text-gray-400 font-normal uppercase tracking-wider ml-1">Aksi Produk</DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-gray-100 my-1"/>
                                        <DropdownMenuItem onClick={() => openEditModal(item)} className="cursor-pointer rounded-lg hover:bg-blue-50 focus:bg-blue-50 py-2">
                                            <Pencil className="w-4 h-4 mr-2 text-blue-600"/> 
                                            <span className="font-medium text-gray-700">Edit Data</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {/* TODO: Print Logic */}} className="cursor-pointer rounded-lg hover:bg-gray-50 focus:bg-gray-50 py-2">
                                            <QrCode className="w-4 h-4 mr-2 text-gray-600"/> 
                                            <span className="font-medium text-gray-700">Cetak Label</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-gray-100 my-1"/>
                                        <DropdownMenuItem 
                                            onClick={() => handleDelete(item.id, item.name)} 
                                            className="text-red-600 cursor-pointer rounded-lg hover:bg-red-50 focus:bg-red-50 py-2 focus:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2"/> 
                                            <span className="font-medium">Hapus Produk</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))
                    )}
                </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- MODAL EDIT (ANIMATED GLASS) --- */}
      {isEditOpen && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 border border-white/50">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/50">
                    <h3 className="font-bold text-lg text-[#004aad] flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Pencil className="w-4 h-4"/> 
                        </div>
                        Edit Produk
                    </h3>
                    <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-all">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    <div className="space-y-2">
                        <Label className="text-gray-600 font-medium">Nama Produk</Label>
                        <Input 
                            value={editData.nama_produk} 
                            onChange={(e) => setEditData({...editData, nama_produk: e.target.value})}
                            className="focus-visible:ring-[#004aad] bg-gray-50 border-gray-200"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-gray-600 font-medium">Departemen</Label>
                            <Select 
                                value={editData.id_departemen} 
                                onValueChange={(val) => setEditData({...editData, id_departemen: val})}
                            >
                                <SelectTrigger className="bg-gray-50 border-gray-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {deptData?.data?.map((dept: any) => (
                                        <SelectItem key={dept.id} value={dept.id}>{dept.nama}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-600 font-medium">Satuan</Label>
                            <Select 
                                value={editData.satuan} 
                                onValueChange={(val) => setEditData({...editData, satuan: val})}
                            >
                                <SelectTrigger className="bg-gray-50 border-gray-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {unitData?.data?.map((u: any) => (
                                        <SelectItem key={u.id} value={u.nama}>{u.nama}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3 items-start">
                        <Box className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"/>
                        <div className="text-xs text-blue-700 leading-relaxed">
                            <p className="font-bold mb-1 uppercase tracking-wide">Info Stok</p>
                            Stok saat ini: <b className="text-sm">{editData.stok}</b>. <br/>
                            Perubahan jumlah stok hanya dapat dilakukan melalui menu Transaksi atau Stock Opname.
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-gray-200 text-gray-600 hover:bg-white hover:text-gray-800">Batal</Button>
                    <Button onClick={handleUpdate} disabled={isUpdating} className="bg-[#004aad] hover:bg-blue-900 text-white shadow-lg shadow-blue-900/20">
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
                        Simpan Perubahan
                    </Button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}