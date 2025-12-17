'use client';

import { useState } from 'react';
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

// Fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function InventoryPage() {
  const { data, error, mutate } = useSWR('/api/products', fetcher);
  const { data: unitData } = useSWR('/api/units', fetcher);
  const { data: deptData } = useSWR('/api/departments', fetcher);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nama_produk: '',
    id_departemen: '',
    satuan: 'PCS'
  });

  async function handleSubmit() {
    // Validasi sederhana
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
              
              {/* Input Nama */}
              <div className="space-y-2">
                <Label>Nama Produk</Label>
                <Input 
                  placeholder="Contoh: Kertas A4" 
                  value={formData.nama_produk}
                  onChange={(e) => setFormData({...formData, nama_produk: e.target.value})}
                />
              </div>

              {/* Select Departemen */}
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
                    {/* Jika data belum loading */}
                    {!deptData ? (
                      <SelectItem value="loading" disabled>Memuat...</SelectItem>
                    ) : deptData.data?.length === 0 ? (
                      <SelectItem value="empty" disabled>Belum ada Dept</SelectItem>
                    ) : (
                      // LOOPING DATA DARI API
                      deptData.data.map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.id} ({dept.nama})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Satuan */}
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
                         // Kita simpan NAMANYA (misal: "PCS"), bukan ID-nya, agar sesuai data lama
                         <SelectItem key={u.id} value={u.nama}>
                           {u.nama}
                         </SelectItem>
                       ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Tombol Simpan */}
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading}
                className="w-full font-semibold" // Warna sudah otomatis biru dari globals.css
              >
                {isLoading ? 'Menyimpan...' : '+ Simpan Produk'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* --- BAGIAN 2: TABEL DATA --- */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Stok Barang</CardTitle>
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
                    {/* KITA PERLEBAR KOLOM INI DARI 100px JADI 150px */}
                    <TableHead className="w-[150px]">QR Code</TableHead>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Lokasi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data?.data?.map((item: any) => (
                    <TableRow key={item.id}>
                        <TableCell>
                        {/* PERUBAHAN DISINI: size={80} dan padding diperbesar */}
                        <div className="bg-white p-2 border inline-block rounded-md">
                            <QRCode 
                            value={item.qr_code} 
                            size={80} 
                            level="M" // Tingkat koreksi error (M=Medium) agar lebih mudah discan
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
                    ))}
                </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}