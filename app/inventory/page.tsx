'use client';

import { useState, useEffect, useMemo } from 'react'; // Tambah useEffect & useMemo
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
import { Search, Filter, X } from "lucide-react"; // Tambah Icon

// --- 1. UTILITY: DEBOUNCE HOOK ---
// Ini mencegah filtering berjalan setiap milidetik saat user mengetik cepat
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function InventoryPage() {
  const { data, error, mutate } = useSWR('/api/products', fetcher);
  const { data: unitData } = useSWR('/api/units', fetcher);
  const { data: deptData } = useSWR('/api/departments', fetcher);
  
  const [isLoading, setIsLoading] = useState(false);

  // --- 2. STATE UNTUK FILTER ---
  const [searchQuery, setSearchQuery] = useState(''); // Input user langsung
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL'); // Filter Dept
  
  // Hasil debounce (hanya berubah setelah user berhenti mengetik 500ms)
  const debouncedSearch = useDebounce(searchQuery, 500); 

  // State Form Tambah Produk
  const [formData, setFormData] = useState({
    nama_produk: '',
    id_departemen: '',
    satuan: 'PCS'
  });

  // --- 3. LOGIKA FILTERING (CLIENT SIDE) ---
  // Kita gunakan useMemo agar perhitungan filter hanya jalan jika data/filter berubah
  const filteredProducts = useMemo(() => {
    if (!data?.data) return [];

    return data.data.filter((item: any) => {
      // 1. Cek Filter Departemen
      const matchDept = selectedDeptFilter === 'ALL' || item.department_id === selectedDeptFilter;
      
      // 2. Cek Search (Nama Produk ATAU Kode QR)
      const query = debouncedSearch.toLowerCase();
      const matchSearch = 
        item.name.toLowerCase().includes(query) || 
        (item.qr_code && item.qr_code.toLowerCase().includes(query));

      return matchDept && matchSearch;
    });
  }, [data, selectedDeptFilter, debouncedSearch]);


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

  // Fungsi Reset Filter
  const handleResetFilter = () => {
    setSearchQuery('');
    setSelectedDeptFilter('ALL');
  };

  return (
    <div className="min-h-screen bg-white p-6 md:p-10 font-sans">
      <Navbar/>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#004aad]">Dashboard Kepala Gudang</h1>
          <p className="text-muted-foreground">Kelola master data produk dan cetak label QR.</p>
        </div>

        {/* --- BAGIAN 1: FORM INPUT (CARD) --- */}
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
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Dept..." />
                  </SelectTrigger>
                  <SelectContent>
                    {!deptData ? (
                      <SelectItem value="loading" disabled>Memuat...</SelectItem>
                    ) : deptData.data?.length === 0 ? (
                      <SelectItem value="empty" disabled>Belum ada Dept</SelectItem>
                    ) : (
                      deptData?.data.map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.id} ({dept.nama})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Satuan</Label>
                <Select 
                  value={formData.satuan} 
                  onValueChange={(val) => setFormData({...formData, satuan: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih..." />
                  </SelectTrigger>
                  <SelectContent>
                    {!unitData ? (
                       <SelectItem value="loading" disabled>Memuat...</SelectItem>
                    ) : unitData.data?.length === 0 ? (
                       <SelectItem value="empty" disabled>Belum ada Satuan</SelectItem>
                    ) : (
                       unitData.data?.map((u: any) => (
                         <SelectItem key={u.id} value={u.nama}>
                           {u.nama}
                         </SelectItem>
                       ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleSubmit} 
                disabled={isLoading}
                className="w-full font-semibold"
              >
                {isLoading ? 'Menyimpan...' : '+ Simpan Produk'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* --- BAGIAN BARU: FILTER SECTION --- */}
        <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-gray-50 p-4 rounded-lg border">
            {/* Kiri: Filter Search & Dept */}
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-3/4">
                
                {/* 1. Filter Search (Debounced) */}
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

                {/* 2. Filter Departemen */}
                <div className="w-full md:w-1/3 space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 uppercase">Filter Departemen</Label>
                    <Select 
                        value={selectedDeptFilter} 
                        onValueChange={setSelectedDeptFilter}
                    >
                        <SelectTrigger className="bg-white">
                             <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-gray-500"/>
                                <SelectValue placeholder="Semua Departemen" />
                             </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua Departemen</SelectItem>
                            {deptData?.data?.map((dept: any) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                    {dept.nama}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Kanan: Reset Button */}
            {(searchQuery || selectedDeptFilter !== 'ALL') && (
                <Button 
                    variant="ghost" 
                    onClick={handleResetFilter}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                    <X className="w-4 h-4 mr-2" /> Reset Filter
                </Button>
            )}
        </div>

        {/* --- BAGIAN 2: TABEL DATA --- */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Stok Barang</CardTitle>
            <Badge variant="outline" className="ml-2">
                Total: {filteredProducts.length} Item
            </Badge>
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
                    <TableHead className="w-[150px]">QR Code</TableHead>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Lokasi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredProducts.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                Tidak ada produk yang cocok dengan filter.
                            </TableCell>
                        </TableRow>
                    ) : (
                        // MAPPING DARI filteredProducts (BUKAN data.data LANGSUNG)
                        filteredProducts.map((item: any) => (
                        <TableRow key={item.id}>
                            <TableCell>
                            <div className="bg-white p-2 border inline-block rounded-md">
                                <QRCode 
                                value={item.qr_code} 
                                size={80} 
                                level="M" 
                                />
                            </div>
                            <div className="text-[10px] text-gray-400 mt-2 font-mono font-bold tracking-wider">
                                {item.qr_code}
                            </div>
                            </TableCell>
                            <TableCell className="font-medium align-top pt-4">
                            <div className="text-base">{item.name}</div>
                            <div className="text-xs text-gray-400 font-normal mt-1">ID: {(item.id || '').substring(0, 8)}....</div>
                            </TableCell>
                            <TableCell className="align-top pt-4">
                            <Badge variant="secondary" className="text-sm px-3 py-1 font-bold">
                                {item.stock} {item.unit}
                            </Badge>
                            </TableCell>
                            <TableCell className="align-top pt-4">
                            <Badge variant="outline" className="border-[#004aad] text-[#004aad]">
                                {item.department_id}
                            </Badge>
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
    </div>
  );
}