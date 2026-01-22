'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Navbar from '../../components/Navbar';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Trash2, Plus, Scale, Pencil, X, Save, Loader2, Info, Ruler } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UnitsPage() {
  const { data, mutate, isLoading } = useSWR('/api/units', fetcher);
  
  const [formData, setFormData] = useState({ nama: '', keterangan: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({ nama: '', keterangan: '' });
    setEditingId(null);
    setIsSubmitting(false);
  };

  const handleEditClick = (item: any) => {
    setFormData({ nama: item.nama, keterangan: item.keterangan || '' });
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function handleSubmit() {
    if (!formData.nama) return alert("Nama satuan wajib diisi");
    
    setIsSubmitting(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...formData } : formData;

      const res = await fetch('/api/units', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error((await res.json()).error);

      mutate();
      resetForm();
    } catch (error: any) {
      alert("Gagal: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`Hapus satuan ${id}?`)) return;
    await fetch(`/api/units?id=${id}`, { method: 'DELETE' });
    mutate();
    if (editingId === id) resetForm();
  }

  return (
    // 1. BACKGROUND GRADIENT KONSISTEN
    <div className="min-h-screen bg-gradient-to-br from-[#004aad]/5 via-white to-blue-50 font-sans pb-20">
      <Navbar />
      
      <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8 pt-24">
        
        {/* --- HEADER (GLASS STYLE) --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm relative overflow-hidden group">
            {/* Dekorasi BG */}
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <Scale className="w-24 h-24 text-[#004aad]" />
            </div>

            <div className="relative z-10">
                <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight flex items-center gap-3">
                    <Ruler className="w-8 h-8 opacity-80"/> Master Satuan Unit
                </h1>
                <p className="text-gray-500 mt-1 font-medium">Kelola jenis kemasan produk (PCS, BOX, KG, dll).</p>
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
                      <span className="text-orange-700">Edit Satuan</span>
                      <span className="text-xs font-mono bg-orange-100 text-orange-800 px-2 py-0.5 rounded ml-2">{editingId}</span>
                    </>
                  ) : (
                    <>
                      <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                        <Plus className="w-5 h-5"/>
                      </div>
                      <span className="text-[#004aad]">Tambah Satuan Baru</span>
                    </>
                  )}
                </CardTitle>
                <CardDescription className="ml-9">
                  Satuan yang terdaftar di sini akan muncul sebagai pilihan saat Input Produk Baru.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="w-full md:w-1/3 space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Nama Satuan</label>
                        <Input 
                            value={formData.nama}
                            onChange={e => setFormData({...formData, nama: e.target.value})}
                            className={`bg-white/50 focus:bg-white transition-all uppercase ${editingId ? 'focus-visible:ring-orange-500' : 'focus-visible:ring-[#004aad]'}`}
                            placeholder="Cth: PCS"
                        />
                    </div>
                    <div className="w-full space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Keterangan (Opsional)</label>
                        <Input 
                            value={formData.keterangan}
                            onChange={e => setFormData({...formData, keterangan: e.target.value})}
                            className={`bg-white/50 focus:bg-white transition-all ${editingId ? 'focus-visible:ring-orange-500' : 'focus-visible:ring-[#004aad]'}`}
                            placeholder="Deskripsi singkat..."
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
                            <TableHead className="py-4 pl-6 font-bold text-gray-600 w-[100px]">ID</TableHead>
                            <TableHead className="py-4 font-bold text-gray-600">Nama Satuan</TableHead>
                            <TableHead className="py-4 font-bold text-gray-600">Keterangan</TableHead>
                            <TableHead className="py-4 font-bold text-gray-600 text-right pr-6">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!data?.data ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 animate-spin text-[#004aad]/50"/>
                                        <span>Memuat data satuan...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : data.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-gray-400">
                                    <Info className="w-10 h-10 mx-auto mb-2 opacity-20"/>
                                    Belum ada data satuan. Silakan tambah baru.
                                </TableCell>
                            </TableRow>
                        ) : (
                          data.data.map((item: any) => (
                            <TableRow 
                                key={item.id} 
                                className={`transition-colors border-b border-gray-50 last:border-0 ${
                                    editingId === item.id ? "bg-orange-50 hover:bg-orange-50" : "hover:bg-blue-50/40"
                                }`}
                            >
                                <TableCell className="pl-6 font-bold font-mono text-[#004aad]">{item.id}</TableCell>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <Scale className="w-4 h-4 text-gray-400"/> {item.nama}
                                </TableCell>
                                <TableCell className="text-gray-500 italic">{item.keterangan || '-'}</TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex justify-end gap-2">
                                        {/* Edit Button */}
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleEditClick(item)} 
                                            className={`h-8 w-8 transition-colors ${editingId === item.id ? 'bg-orange-200 text-orange-700' : 'text-blue-600 hover:bg-blue-100'}`}
                                            title="Edit Satuan"
                                        >
                                            <Pencil className="w-4 h-4"/>
                                        </Button>
                                        
                                        {/* Delete Button */}
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleDelete(item.id)} 
                                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Hapus Satuan"
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
            </CardContent>
        </Card>

      </div>
    </div>
  );
}