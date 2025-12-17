'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Navbar from '../../components/Navbar';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Trash2, Plus, Scale, Pencil, X, Save } from "lucide-react"; // Ikon Scale untuk satuan

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UnitsPage() {
  const { data, mutate } = useSWR('/api/units', fetcher);
  
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
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold text-[#004aad]">Master Satuan Unit</h1>
          <p className="text-gray-500">Kelola jenis kemasan (PCS, BOX, KG, dll).</p>
        </div>

        <Card className={`border-t-4 transition-colors ${editingId ? 'border-t-orange-500 bg-orange-50' : 'border-t-[#004aad]'}`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {editingId ? (
                    <><Pencil className="w-5 h-5 text-orange-600"/> <span className="text-orange-700">Edit Satuan: {editingId}</span></>
                  ) : "Tambah Satuan Baru"}
                </CardTitle>
                <CardDescription>Satuan yang terdaftar akan muncul di form tambah produk.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-1/3 space-y-2">
                        <label className="text-sm font-medium">Nama Satuan (Cth: PCS)</label>
                        <Input 
                            value={formData.nama}
                            onChange={e => setFormData({...formData, nama: e.target.value})}
                            className="bg-white"
                            placeholder="Huruf Besar disarankan"
                        />
                    </div>
                    <div className="w-full space-y-2">
                        <label className="text-sm font-medium">Keterangan</label>
                        <Input 
                            value={formData.keterangan}
                            onChange={e => setFormData({...formData, keterangan: e.target.value})}
                            className="bg-white"
                        />
                    </div>
                    <div className="flex gap-2">
                      {editingId && (
                        <Button variant="outline" onClick={resetForm} disabled={isSubmitting}><X className="w-4 h-4 mr-2"/> Batal</Button>
                      )}
                      <Button onClick={handleSubmit} disabled={isSubmitting} className={`min-w-[120px] ${editingId ? 'bg-orange-600 hover:bg-orange-700' : ''}`}>
                          {isSubmitting ? '...' : (editingId ? <><Save className="w-4 h-4 mr-2"/> Simpan</> : <><Plus className="w-4 h-4 mr-2"/> Tambah</>)}
                      </Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardContent className="pt-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Satuan</TableHead>
                            <TableHead>Keterangan</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!data?.data ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-4">Memuat...</TableCell></TableRow>
                        ) : data.data.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-4 text-gray-400">Belum ada data</TableCell></TableRow>
                        ) : (
                          data.data.map((item: any) => (
                            <TableRow key={item.id} className={editingId === item.id ? "bg-orange-50" : ""}>
                                <TableCell className="font-bold font-mono text-[#004aad]">{item.id}</TableCell>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <Scale className="w-4 h-4 text-gray-400"/> {item.nama}
                                </TableCell>
                                <TableCell className="text-gray-500">{item.keterangan || '-'}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(item)} className="text-blue-600 hover:bg-blue-50">
                                          <Pencil className="w-4 h-4"/>
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50">
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