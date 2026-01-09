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
import { Search, Filter, X, Trash2, Pencil, Save, Loader2 } from "lucide-react"; // Tambah Icon
import logo from "../../src/logo.png"

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
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Menyimpan ID yang sedang dihapus

  // --- STATE FILTER ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const debouncedSearch = useDebounce(searchQuery, 500); 

  // --- STATE CREATE ---
  const [formData, setFormData] = useState({
    nama_produk: '',
    id_departemen: '',
    satuan: 'PCS'
  });

  // --- STATE EDIT (MODAL) ---
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

  // --- 1. HANDLE CREATE ---
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

  // --- 2. HANDLE DELETE ---
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${name}"? Data yang dihapus tidak bisa dikembalikan.`)) return;

    setIsDeleting(id);
    try {
      // Asumsi Backend menerima DELETE di /api/products?id=...
      // Anda perlu memastikan route.ts menghandle method DELETE
      const res = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        mutate(); // Refresh data
      } else {
        const json = await res.json();
        alert("Gagal menghapus: " + (json.error || "Server Error"));
      }
    } catch (error) {
      alert("Terjadi kesalahan koneksi");
    } finally {
      setIsDeleting(null);
    }
  }

  // --- 3. HANDLE EDIT (OPEN MODAL) ---
  const openEditModal = (product: any) => {
    setEditData({
      id: product.id,
      nama_produk: product.name,
      id_departemen: product.department_id,
      satuan: product.unit,
      stok: product.stock // Stok biasanya readonly di edit master, tapi kita bawa dulu
    });
    setIsEditOpen(true);
  };

  // --- 4. HANDLE UPDATE (SAVE) ---
  async function handleUpdate() {
    setIsUpdating(true);
    try {
        const res = await fetch('/api/products', {
            method: 'PUT', // Atau PATCH, sesuaikan backend
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editData),
        });

        if (res.ok) {
            setIsEditOpen(false);
            setEditData(null);
            mutate(); // Refresh tabel
        } else {
            alert("Gagal mengupdate produk");
        }
    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan");
    } finally {
        setIsUpdating(false);
    }
  }

  const handleResetFilter = () => {
    setSearchQuery('');
    setSelectedDeptFilter('ALL');
  };

  return (
    <div className="min-h-screen bg-white p-6 md:p-10 font-sans relative">
      <Navbar/>
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#004aad]">Dashboard Kepala Gudang</h1>
          <p className="text-muted-foreground">Kelola master data produk dan cetak label QR.</p>
        </div>

        {/* FORM CREATE */}
        <Card className="border-t-4 border-t-[#004aad] shadow-sm">
          <CardHeader>
            <CardTitle>Tambah Produk Baru</CardTitle>
            <CardDescription>Produk baru akan otomatis mendapatkan QR Code unik.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <Label>Nama Produk</Label>
                <Input 
                  placeholder="Contoh: Kertas A4" 
                  value={formData.nama_produk}
                  onChange={(e) => setFormData({...formData, nama_produk: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Departemen</Label>
                <Select 
                  value={formData.id_departemen} 
                  onValueChange={(val) => setFormData({...formData, id_departemen: val})}
                >
                  <SelectTrigger><SelectValue placeholder="Pilih Dept..." /></SelectTrigger>
                  <SelectContent>
                    {!deptData ? <SelectItem value="loading" disabled>Memuat...</SelectItem> 
                    : deptData.data?.map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.id} ({dept.nama})</SelectItem>
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
                  <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                  <SelectContent>
                    {!unitData ? <SelectItem value="loading" disabled>Memuat...</SelectItem> 
                    : unitData.data?.map((u: any) => (
                         <SelectItem key={u.id} value={u.nama}>{u.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} disabled={isLoading} className="w-full font-semibold">
                {isLoading ? 'Menyimpan...' : '+ Simpan Produk'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* FILTER SECTION */}
        <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-gray-50 p-4 rounded-lg border">
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-3/4">
                <div className="w-full md:w-1/2 space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 uppercase">Cari Produk / QR</Label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input 
                            placeholder="Ketik nama produk..." 
                            className="pl-9 bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="w-full md:w-1/3 space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 uppercase">Filter Departemen</Label>
                    <Select value={selectedDeptFilter} onValueChange={setSelectedDeptFilter}>
                        <SelectTrigger className="bg-white">
                             <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-gray-500"/>
                                <SelectValue placeholder="Semua Departemen" />
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
            </div>
            {(searchQuery || selectedDeptFilter !== 'ALL') && (
                <Button variant="ghost" onClick={handleResetFilter} className="text-red-500 hover:bg-red-50">
                    <X className="w-4 h-4 mr-2" /> Reset Filter
                </Button>
            )}
        </div>

        {/* TABEL DATA */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Stok Barang</CardTitle>
            <Badge variant="outline" className="ml-2">Total: {filteredProducts.length} Item</Badge>
          </CardHeader>
          <CardContent>
            {!data ? (
              <div className="text-center py-10 text-gray-500">Memuat data...</div>
            ) : error ? (
              <div className="text-center py-10 text-red-500">Gagal terhubung ke server</div>
            ) : (
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[120px]">QR Code</TableHead>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead> {/* KOLOM BARU */}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredProducts.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">Tidak ada produk.</TableCell>
                        </TableRow>
                    ) : (
                        filteredProducts.map((item: any) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <div className="bg-white p-2 border inline-block rounded-md">
                                    <QRCode value={item.qr_code} size={60} level="M" />
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1 font-mono font-bold">{item.qr_code}</div>
                            </TableCell>
                            <TableCell className="font-medium align-top pt-4">
                                <div className="text-base">{item.name}</div>
                                <div className="text-xs text-gray-400 font-normal mt-1">ID: {(item.id || '').substring(0, 8)}...</div>
                            </TableCell>
                            <TableCell className="align-top pt-4">
                                <Badge variant="secondary" className="text-sm px-3 py-1 font-bold">{item.stock} {item.unit}</Badge>
                            </TableCell>
                            <TableCell className="align-top pt-4">
                                <Badge variant="outline" className="border-[#004aad] text-[#004aad]">{item.department_id}</Badge>
                            </TableCell>
                            {/* --- TOMBOL AKSI --- */}
                            <TableCell className="align-top pt-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <Button 
                                        variant="outline" size="sm" 
                                        onClick={() => openEditModal(item)}
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                        variant="outline" size="sm" 
                                        onClick={() => handleDelete(item.id, item.name)}
                                        disabled={isDeleting === item.id}
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        {isDeleting === item.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4" />}
                                    </Button>
                                </div>
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

      {/* --- MODAL EDIT PRODUK (Simple Tailwind Modal) --- */}
      {isEditOpen && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800">Edit Produk</h3>
                    <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label>Nama Produk</Label>
                        <Input 
                            value={editData.nama_produk} 
                            onChange={(e) => setEditData({...editData, nama_produk: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Departemen</Label>
                        <Select 
                            value={editData.id_departemen} 
                            onValueChange={(val) => setEditData({...editData, id_departemen: val})}
                        >
                            <SelectTrigger><SelectValue placeholder="Pilih Dept..." /></SelectTrigger>
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
                            value={editData.satuan} 
                            onValueChange={(val) => setEditData({...editData, satuan: val})}
                        >
                            <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                            <SelectContent>
                                {unitData?.data?.map((u: any) => (
                                    <SelectItem key={u.id} value={u.nama}>{u.nama}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-700 border border-yellow-200">
                        Info: Stok hanya bisa diubah melalui menu Transaksi (IN/OUT) atau Stock Opname.
                    </div>
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
                    <Button onClick={handleUpdate} disabled={isUpdating} className="bg-[#004aad]">
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