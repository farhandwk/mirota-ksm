'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import Navbar from '../../components/Navbar';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { 
  Trash2, Plus, Building, Pencil, X, Save, Warehouse, Loader2, Info,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight // Import Icon Paginasi
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DepartmentsPage() {
  const { data, mutate, isLoading } = useSWR('/api/departments', fetcher);
  
  const [formData, setFormData] = useState({ nama: '', deskripsi: '' });
  const [editingId, setEditingId] = useState<string | null>(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STATE PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Kita set 5 agar paginasi terlihat (karena data gudang biasanya sedikit)

  // Fungsi Reset Form
  const resetForm = () => {
    setFormData({ nama: '', deskripsi: '' });
    setEditingId(null);
    setIsSubmitting(false);
  };

  // Handler: Tombol Edit ditekan
  const handleEditClick = (dept: any) => {
    setFormData({ nama: dept.nama, deskripsi: dept.deskripsi || '' });
    setEditingId(dept.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler: Simpan
  async function handleSubmit() {
    if (!formData.nama) return alert("Nama gudang wajib diisi");
    setIsSubmitting(true);

    try {
      if (editingId) {
        // UPDATE
        const res = await fetch('/api/departments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...formData }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        // CREATE
        const res = await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      mutate(); 
      resetForm(); 
    } catch (error: any) {
      alert("Gagal: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`Hapus gudang ${id}? Pastikan tidak ada produk yang terikat!`)) return;
    await fetch(`/api/departments?id=${id}`, { method: 'DELETE' });
    mutate();
    if (editingId === id) resetForm();
  }

  // --- LOGIC PAGINATION ---
  // Menghitung total halaman
  const totalPages = data?.data ? Math.ceil(data.data.length / itemsPerPage) : 0;

  // Memotong data sesuai halaman aktif
  const paginatedData = useMemo(() => {
    if (!data?.data) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.data.slice(startIndex, startIndex + itemsPerPage);
  }, [data, currentPage]);

  // Reset halaman jika data berubah (misal dihapus sampai habis di page tsb)
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);


  return (
    // 1. BACKGROUND GRADIENT KONSISTEN
    <div className="min-h-screen bg-gradient-to-br from-[#004aad]/5 via-white to-blue-50 font-sans pb-20">
      <Navbar />
      
      <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8 pt-24">
        
        {/* --- HEADER (GLASS STYLE) --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm relative overflow-hidden group">
            {/* Dekorasi BG */}
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <Warehouse className="w-24 h-24 text-[#004aad]" />
            </div>

            <div className="relative z-10">
                <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight flex items-center gap-3">
                    <Building className="w-8 h-8 opacity-80"/> Manajemen Gudang
                </h1>
                <p className="text-gray-500 mt-1 font-medium">Kelola lokasi penyimpanan barang (Departemen/Gudang).</p>
            </div>
        </div>

        {/* --- FORM INPUT / EDIT (GLASS CARD) --- */}
        <Card className={`border-0 border-l-4 shadow-lg bg-white/80 backdrop-blur-md transition-all duration-300 ${editingId ? 'border-l-orange-500 ring-2 ring-orange-100' : 'border-l-[#004aad]'}`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {editingId ? (
                    <>
                      <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
                        <Pencil className="w-5 h-5"/> 
                      </div>
                      <span className="text-orange-700">Edit Data Gudang</span>
                      <span className="text-xs font-mono bg-orange-100 text-orange-800 px-2 py-0.5 rounded ml-2">{editingId}</span>
                    </>
                  ) : (
                    <>
                      <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                        <Plus className="w-5 h-5"/>
                      </div>
                      <span className="text-[#004aad]">Tambah Gudang Baru</span>
                    </>
                  )}
                </CardTitle>
                <CardDescription className="ml-9">
                  {editingId 
                    ? "Perbarui informasi nama atau deskripsi gudang di bawah ini." 
                    : "ID Gudang akan dibuat otomatis oleh sistem (Format: D-XXX)."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="w-full md:w-1/3 space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Nama Gudang</label>
                        <Input 
                            placeholder="Contoh: Logistik Pusat" 
                            value={formData.nama}
                            onChange={e => setFormData({...formData, nama: e.target.value})}
                            className={`bg-white/50 focus:bg-white transition-all ${editingId ? 'focus-visible:ring-orange-500' : 'focus-visible:ring-[#004aad]'}`}
                        />
                    </div>
                    <div className="w-full space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Deskripsi (Opsional)</label>
                        <Input 
                            placeholder="Keterangan lokasi atau fungsi gudang..." 
                            value={formData.deskripsi}
                            onChange={e => setFormData({...formData, deskripsi: e.target.value})}
                            className={`bg-white/50 focus:bg-white transition-all ${editingId ? 'focus-visible:ring-orange-500' : 'focus-visible:ring-[#004aad]'}`}
                        />
                    </div>
                    
                    {/* ACTION BUTTONS */}
                    <div className="flex gap-2 w-full md:w-auto">
                      {editingId && (
                        <Button variant="outline" onClick={resetForm} disabled={isSubmitting} className="border-gray-300 text-gray-600 hover:bg-gray-50">
                           <X className="w-4 h-4 mr-2"/> Batal
                        </Button>
                      )}
                      
                      <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting} 
                        className={`min-w-[120px] shadow-md transition-all active:scale-95 text-white font-bold ${
                            editingId ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-900/20' : 'bg-[#004aad] hover:bg-blue-900 shadow-blue-900/20'
                        }`}
                      >
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : (
                            editingId ? <><Save className="w-4 h-4 mr-2"/> Simpan</> : <><Plus className="w-4 h-4 mr-2"/> Tambah</>
                          )}
                      </Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* --- TABEL LIST (GLASS CONTAINER) --- */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-md overflow-hidden ring-1 ring-white/50">
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-gray-50/50 backdrop-blur-sm border-b border-gray-100">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="py-4 pl-6 font-bold text-gray-600 w-[150px]">ID Gudang</TableHead>
                            <TableHead className="py-4 font-bold text-gray-600">Nama Gudang</TableHead>
                            <TableHead className="py-4 font-bold text-gray-600">Deskripsi</TableHead>
                            <TableHead className="py-4 font-bold text-gray-600 text-right pr-6">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!data?.data ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 animate-spin text-[#004aad]/50"/>
                                        <span>Memuat data gudang...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : data.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-gray-400">
                                    <Info className="w-10 h-10 mx-auto mb-2 opacity-20"/>
                                    Belum ada data gudang. Silakan tambah baru.
                                </TableCell>
                            </TableRow>
                        ) : (
                          // Menggunakan paginatedData bukan data.data langsung
                          paginatedData.map((dept: any) => (
                            <TableRow 
                                key={dept.id} 
                                className={`transition-colors border-b border-gray-50 last:border-0 ${
                                    editingId === dept.id ? "bg-orange-50 hover:bg-orange-50" : "hover:bg-blue-50/40"
                                }`}
                            >
                                <TableCell className="pl-6 font-bold font-mono text-[#004aad]">{dept.id}</TableCell>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2 text-gray-800">
                                        <Building className="w-4 h-4 text-gray-400"/> {dept.nama}
                                    </div>
                                </TableCell>
                                <TableCell className="text-gray-500 italic">{dept.deskripsi || '-'}</TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex justify-end gap-2">
                                        {/* Edit Button */}
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleEditClick(dept)} 
                                            className={`h-8 w-8 transition-colors ${editingId === dept.id ? 'bg-orange-200 text-orange-700' : 'text-blue-600 hover:bg-blue-100'}`}
                                            title="Edit Gudang"
                                        >
                                            <Pencil className="w-4 h-4"/>
                                        </Button>
                                        
                                        {/* Delete Button */}
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleDelete(dept.id)} 
                                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Hapus Gudang"
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                          ))
                        )}
                    </TableBody>
                </Table>

                {/* --- PAGINATION CONTROLS (FOOTER) --- */}
                {data?.data?.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                        <div className="text-sm text-gray-500">
                            Menampilkan <b>{(currentPage - 1) * itemsPerPage + 1}</b> - <b>{Math.min(currentPage * itemsPerPage, data.data.length)}</b> dari <b>{data.data.length}</b> gudang
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
            </CardContent>
        </Card>

      </div>
    </div>
  );
}