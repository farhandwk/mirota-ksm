'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Navbar from '../../components/Navbar';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Trash2, Plus, UserCog, Pencil, X, Save, Shield, Key } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UsersPage() {
  const { data, mutate } = useSWR('/api/users', fetcher);
  
  const [formData, setFormData] = useState({ username: '', password: '', role: '', fullname: '' });
  const [editingId, setEditingId] = useState<string | null>(null); // Menyimpan username yang diedit
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({ username: '', password: '', role: '', fullname: '' });
    setEditingId(null);
    setIsSubmitting(false);
  };

  const handleEditClick = (user: any) => {
    setFormData({ 
        username: user.username, 
        password: user.password, 
        role: user.role, 
        fullname: user.fullname 
    });
    setEditingId(user.username);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function handleSubmit() {
    if (!formData.username || !formData.password || !formData.role) {
        return alert("Username, Password, dan Role wajib diisi");
    }
    
    setIsSubmitting(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      // Jika edit, username dikirim di body untuk pencarian, tapi biasanya tidak diubah (primary key sederhana)
      
      const res = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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

  async function handleDelete(username: string) {
    if (username === 'admin') return alert("User admin utama tidak boleh dihapus!");
    if (!confirm(`Hapus user ${username}?`)) return;

    await fetch(`/api/users?username=${username}`, { method: 'DELETE' });
    mutate();
    if (editingId === username) resetForm();
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold text-[#004aad]">Manajemen Pengguna</h1>
          <p className="text-gray-500">Kelola akses Kepala Gudang, Manajerial, dan Petugas.</p>
        </div>

        {/* FORM INPUT / EDIT */}
        <Card className={`border-t-4 transition-colors ${editingId ? 'border-t-orange-500 bg-orange-50' : 'border-t-[#004aad]'}`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {editingId ? (
                    <><Pencil className="w-5 h-5 text-orange-600"/> <span className="text-orange-700">Edit User: {editingId}</span></>
                  ) : "Tambah User Baru"}
                </CardTitle>
                <CardDescription>Buat akun untuk staf atau manajer baru.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Username</label>
                        <Input 
                            placeholder="cth: petugas1" 
                            value={formData.username}
                            onChange={e => setFormData({...formData, username: e.target.value})}
                            className="bg-white"
                            disabled={!!editingId} // Username tidak boleh diganti saat edit
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Password</label>
                        <Input 
                            type="text" // Plain text agar admin bisa lihat
                            placeholder="Password..." 
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            className="bg-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Role (Jabatan)</label>
                        <Select 
                            value={formData.role} 
                            onValueChange={(val) => setFormData({...formData, role: val})}
                        >
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Pilih Role..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Kepala Gudang">Kepala Gudang (Admin)</SelectItem>
                                <SelectItem value="Manajerial">Manajerial (Analytics Only)</SelectItem>
                                <SelectItem value="Petugas">Petugas (Scanner Only)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nama Lengkap</label>
                        <Input 
                            placeholder="cth: Budi Santoso" 
                            value={formData.fullname}
                            onChange={e => setFormData({...formData, fullname: e.target.value})}
                            className="bg-white"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                      {editingId && (
                        <Button variant="outline" onClick={resetForm} disabled={isSubmitting}><X className="w-4 h-4 mr-2"/> Batal</Button>
                      )}
                      <Button onClick={handleSubmit} disabled={isSubmitting} className={`min-w-[120px] ${editingId ? 'bg-orange-600 hover:bg-orange-700' : ''}`}>
                          {isSubmitting ? '...' : (editingId ? <><Save className="w-4 h-4 mr-2"/> Simpan Perubahan</> : <><Plus className="w-4 h-4 mr-2"/> Tambah User</>)}
                      </Button>
                </div>
            </CardContent>
        </Card>

        {/* TABEL LIST */}
        <Card>
            <CardContent className="pt-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>Nama Lengkap</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Password</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!data?.data ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-4">Memuat...</TableCell></TableRow>
                        ) : data.data.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-4 text-gray-400">Belum ada user</TableCell></TableRow>
                        ) : (
                          data.data.map((user: any) => (
                            <TableRow key={user.username} className={editingId === user.username ? "bg-orange-50" : ""}>
                                <TableCell className="font-bold font-mono text-[#004aad]">{user.username}</TableCell>
                                <TableCell className="font-medium">{user.fullname}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded text-xs font-bold 
                                        ${user.role === 'Kepala Gudang' ? 'bg-blue-100 text-blue-700' : 
                                          user.role === 'Manajerial' ? 'bg-purple-100 text-purple-700' : 
                                          'bg-green-100 text-green-700'}`}>
                                        {user.role}
                                    </span>
                                </TableCell>
                                <TableCell className="text-gray-500 font-mono text-xs">
                                    <div className="flex items-center gap-1">
                                        <Key className="w-3 h-3"/> {user.password}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(user)} className="text-blue-600 hover:bg-blue-50">
                                          <Pencil className="w-4 h-4"/>
                                      </Button>
                                      {user.username !== 'admin' && (
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(user.username)} className="text-red-500 hover:bg-red-50">
                                            <Trash2 className="w-4 h-4"/>
                                        </Button>
                                      )}
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
