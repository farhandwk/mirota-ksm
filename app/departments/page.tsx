'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Navbar from '../../components/Navbar';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Trash2, Plus, Building, Pencil, X, Save } from "lucide-react"; // Tambah icon Pencil, X, Save

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DepartmentsPage() {
  const { data, mutate } = useSWR('/api/departments', fetcher);
  
  const [formData, setFormData] = useState({ nama: '', deskripsi: '' });
  const [editingId, setEditingId] = useState<string | null>(null); // State untuk mode edit
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    // Scroll ke atas agar user lihat formnya
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler: Simpan (Bisa Tambah atau Update)
  async function handleSubmit() {
    if (!formData.nama) return alert("Nama departemen wajib diisi");
    
    setIsSubmitting(true);

    try {
      if (editingId) {
        // --- LOGIKA UPDATE (PUT) ---
        const res = await fetch('/api/departments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: editingId, // ID dikirim untuk pencarian di backend
            ...formData 
          }),
        });
        
        if (!res.ok) throw new Error((await res.json()).error);

      } else {
        // --- LOGIKA TAMBAH BARU (POST) ---
        const res = await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!res.ok) throw new Error((await res.json()).error);
      }

      // Sukses
      mutate(); // Refresh data tabel
      resetForm(); // Kembali ke mode awal

    } catch (error: any) {
      alert("Gagal: " + error.message);
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`Hapus departemen ${id}? Pastikan tidak ada produk yang terikat!`)) return;

    await fetch(`/api/departments?id=${id}`, { method: 'DELETE' });
    mutate();
    // Jika yang dihapus sedang diedit, reset form
    if (editingId === id) resetForm();
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
        
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold text-[#004aad]">Manajemen Departemen</h1>
          <p className="text-gray-500">Kelola divisi gudang (Tambah, Edit, Hapus).</p>
        </div>

        {/* FORM INPUT / EDIT */}
        <Card className={`border-t-4 transition-colors ${editingId ? 'border-t-orange-500 bg-orange-50' : 'border-t-[#004aad]'}`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {editingId ? (
                    <>
                      <Pencil className="w-5 h-5 text-orange-600"/> 
                      <span className="text-orange-700">Edit Departemen: {editingId}</span>
                    </>
                  ) : (
                    "Tambah Departemen Baru"
                  )}
                </CardTitle>
                <CardDescription>
                  {editingId 
                    ? "Silakan ubah nama atau deskripsi, lalu klik Simpan." 
                    : "ID Departemen akan dibuat otomatis (D-XXX)"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    
                    <div className="w-full md:w-1/3 space-y-2">
                        <label className="text-sm font-medium">Nama Departemen</label>
                        <Input 
                            placeholder="Cth: Logistik" 
                            value={formData.nama}
                            onChange={e => setFormData({...formData, nama: e.target.value})}
                            className="bg-white"
                        />
                    </div>
                    <div className="w-full space-y-2">
                        <label className="text-sm font-medium">Deskripsi (Opsional)</label>
                        <Input 
                            placeholder="Keterangan singkat..." 
                            value={formData.deskripsi}
                            onChange={e => setFormData({...formData, deskripsi: e.target.value})}
                            className="bg-white"
                        />
                    </div>
                    
                    {/* ACTION BUTTONS */}
                    <div className="flex gap-2">
                      {editingId && (
                        <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>
                           <X className="w-4 h-4 mr-2"/> Batal
                        </Button>
                      )}
                      
                      <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting} 
                        className={`min-w-[120px] ${editingId ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                      >
                          {isSubmitting ? '...' : (
                            editingId ? <><Save className="w-4 h-4 mr-2"/> Simpan</> : <><Plus className="w-4 h-4 mr-2"/> Tambah</>
                          )}
                      </Button>
                    </div>

                </div>
            </CardContent>
        </Card>

        {/* TABEL LIST */}
        <Card>
            <CardContent className="pt-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID Dept</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>Deskripsi</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!data?.data ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-4">Memuat...</TableCell></TableRow>
                        ) : data.data.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-4 text-gray-400">Belum ada departemen</TableCell></TableRow>
                        ) : (
                          data?.data?.map((dept: any) => (
                            <TableRow key={dept.id} className={editingId === dept.id ? "bg-orange-50" : ""}>
                                <TableCell className="font-bold font-mono text-[#004aad]">{dept.id}</TableCell>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <Building className="w-4 h-4 text-gray-400"/> {dept.nama}
                                </TableCell>
                                <TableCell className="text-gray-500">{dept.deskripsi || '-'}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      {/* Tombol Edit */}
                                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(dept)} className="text-blue-600 hover:bg-blue-50">
                                          <Pencil className="w-4 h-4"/>
                                      </Button>
                                      {/* Tombol Hapus */}
                                      <Button variant="ghost" size="sm" onClick={() => handleDelete(dept.id)} className="text-red-500 hover:bg-red-50">
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