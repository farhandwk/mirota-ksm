'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
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
    Search, Filter, X, UserPlus, Trash2, Shield, User, 
    Loader2, KeyRound, Lock, ShieldCheck 
} from "lucide-react"; 

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

export default function UsersPage() {
  // 1. Fetch Data Users
  const { data, error, mutate } = useSWR('/api/users', fetcher);
  const [isLoading, setIsLoading] = useState(false);

  // --- STATE FILTER ---
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const debouncedSearch = useDebounce(searchQuery, 500);

  // --- STATE CREATE FORM ---
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'Petugas',
    fullname: ''
  });

  // --- 2. LOGIC FILTERING (CLIENT SIDE) ---
  const filteredUsers = useMemo(() => {
    if (!data?.data) return [];

    return data.data.filter((user: any) => {
      const matchRole = roleFilter === 'ALL' || user.role === roleFilter;
      const query = debouncedSearch.toLowerCase();
      const matchSearch = 
        (user.username && user.username.toLowerCase().includes(query)) || 
        (user.fullname && user.fullname.toLowerCase().includes(query));

      return matchRole && matchSearch;
    });
  }, [data, roleFilter, debouncedSearch]);

  // --- HANDLE CREATE ---
  async function handleSubmit() {
    if (!formData.username || !formData.password || !formData.fullname) {
      alert("Mohon lengkapi data user");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({ username: '', password: '', role: 'Petugas', fullname: '' }); 
        mutate(); 
        alert("User berhasil ditambahkan!");
      } else {
        const json = await res.json();
        alert("Gagal: " + (json.error || "Unknown Error"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // --- HANDLE DELETE ---
  async function handleDelete(username: string) {
    if(!confirm(`Yakin ingin menghapus user ${username}?`)) return;

    try {
        const res = await fetch(`/api/users?username=${username}`, { method: 'DELETE' });
        if(res.ok) mutate();
        else alert("Gagal menghapus user");
    } catch (e) {
        alert("Error koneksi");
    }
  }

  // Helper untuk warna badge role
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
        case 'Kepala Gudang': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'Manajerial': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
        default: return 'bg-blue-50 text-blue-700 border-blue-200'; // Petugas
    }
  }

  // Reset Filter
  const handleResetFilter = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
  };

  return (
    // 1. BACKGROUND GRADIENT KONSISTEN
    <div className="min-h-screen bg-gradient-to-br from-[#004aad]/5 via-white to-blue-50 font-sans pb-20">
      <Navbar/>
      
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 pt-24">
        
        {/* --- HEADER (GLASS STYLE) --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm relative overflow-hidden group">
            {/* Dekorasi BG */}
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <ShieldCheck className="w-32 h-32 text-[#004aad]" />
            </div>

            <div className="relative z-10">
                <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight flex items-center gap-3">
                    <User className="w-8 h-8 opacity-80"/> Manajemen Pengguna
                </h1>
                <p className="text-gray-500 mt-1 font-medium">Kelola akun, password, dan hak akses petugas gudang.</p>
            </div>
        </div>

        {/* --- FORM CREATE USER (GLASS CARD) --- */}
        <Card className="border-0 border-l-4 border-l-[#004aad] shadow-xl animate-in slide-in-from-top-5 fade-in duration-500 bg-white/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#004aad]">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                    <UserPlus className="w-5 h-5 text-blue-600"/> 
                </div>
                Tambah Pengguna Baru
            </CardTitle>
            <CardDescription className="ml-9">User baru akan langsung bisa login ke sistem.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
              <div className="space-y-2">
                <Label className="text-gray-600 font-medium">Username</Label>
                <Input 
                  placeholder="user.gudang" 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="bg-white/50 focus-visible:ring-[#004aad]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600 font-medium">Password</Label>
                <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input 
                        type="password"
                        placeholder="******" 
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="pl-9 bg-white/50 focus-visible:ring-[#004aad]"
                    />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600 font-medium">Nama Lengkap</Label>
                <Input 
                  placeholder="Cth: Budi Santoso" 
                  value={formData.fullname}
                  onChange={(e) => setFormData({...formData, fullname: e.target.value})}
                  className="bg-white/50 focus-visible:ring-[#004aad]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600 font-medium">Role / Jabatan</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(val) => setFormData({...formData, role: val})}
                >
                  <SelectTrigger className="bg-white/50 border-gray-200">
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Petugas">Petugas Gudang</SelectItem>
                    <SelectItem value="Kepala Gudang">Kepala Gudang</SelectItem>
                    <SelectItem value="Manajerial">Manajerial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleSubmit} 
                disabled={isLoading} 
                className="font-bold bg-[#004aad] hover:bg-blue-900 shadow-md transition-all active:scale-95"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <UserPlus className="w-4 h-4 mr-2"/>}
                {isLoading ? '...' : 'Simpan'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* --- FILTER SECTION (GLASS BAR) --- */}
        <div className="bg-white/70 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-sm sticky top-20 z-20 transition-all flex flex-col md:flex-row gap-4 items-end justify-between">
            {/* Kiri: Search & Role */}
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-3/4">
                
                {/* 1. Search */}
                <div className="w-full md:w-1/2 space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cari User</Label>
                    <div className="relative group">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-[#004aad]" />
                        <Input 
                            placeholder="Ketik username atau nama..." 
                            className="pl-9 bg-white/60 border-gray-200 focus:bg-white transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* 2. Filter Role */}
                <div className="w-full md:w-1/3 space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Filter Role</Label>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="bg-white/60 border-gray-200 shadow-sm">
                             <div className="flex items-center gap-2 text-gray-600">
                                <Filter className="w-3.5 h-3.5"/>
                                <SelectValue placeholder="Semua Role" />
                             </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua Role</SelectItem>
                            <SelectItem value="Petugas">Petugas Gudang</SelectItem>
                            <SelectItem value="Kepala Gudang">Kepala Gudang</SelectItem>
                            <SelectItem value="Manajerial">Manajerial</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Kanan: Reset */}
            {(searchQuery || roleFilter !== 'ALL') && (
                <Button 
                    variant="ghost" 
                    onClick={handleResetFilter}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                >
                    <X className="w-4 h-4 mr-2" /> Reset Filter
                </Button>
            )}
        </div>

        {/* --- TABLE USERS (GLASS CONTAINER) --- */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-md overflow-hidden ring-1 ring-white/50">
          <CardHeader className="border-b border-gray-100 pb-3">
             <div className="flex justify-between items-center">
                <CardTitle className="text-gray-800">Daftar Pengguna Aktif</CardTitle>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">Total: {filteredUsers.length}</Badge>
             </div>
          </CardHeader>
          <CardContent className="p-0">
            {!data ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#004aad]/50"/>
                  <p className="animate-pulse font-medium">Memuat data user...</p>
              </div>
            ) : error ? (
              <div className="text-center py-20 text-red-500">Gagal mengambil data.</div>
            ) : (
              <Table>
                <TableHeader className="bg-gray-50/50 backdrop-blur-sm border-b border-gray-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-4 pl-6 font-bold text-gray-600">Username</TableHead>
                    <TableHead className="py-4 font-bold text-gray-600">Nama Lengkap</TableHead>
                    <TableHead className="py-4 font-bold text-gray-600">Role</TableHead>
                    <TableHead className="py-4 font-bold text-gray-600 text-right pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center py-16 text-gray-400">
                            <Lock className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                            Tidak ada user yang cocok dengan filter.
                        </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user: any) => (
                    <TableRow key={user.username} className="hover:bg-blue-50/40 transition-colors border-b border-gray-50 last:border-0 group">
                      <TableCell className="pl-6 font-mono font-medium text-[#004aad]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-500 border border-gray-200 shadow-sm">
                                <User className="w-4 h-4"/>
                            </div>
                            {user.username}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-gray-700">{user.fullname}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getRoleBadgeColor(user.role)} px-3 py-1 font-bold shadow-sm`}>
                            {user.role === 'Kepala Gudang' && <Shield className="w-3 h-3 mr-1 inline"/>}
                            {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(user.username)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus User"
                        >
                            <Trash2 className="w-4 h-4"/>
                        </Button>
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