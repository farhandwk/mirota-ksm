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
import { Search, Filter, X, UserPlus, Trash2, Shield, User } from "lucide-react"; 

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
      // Filter Role
      const matchRole = roleFilter === 'ALL' || user.role === roleFilter;

      // Filter Search (Cari di Username ATAU Fullname)
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
        mutate(); // Refresh data
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
        // Asumsi API delete support query param ?username=...
        // Anda perlu memastikan backend route.ts menghandle DELETE
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
        case 'Kepala Gudang': return 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200';
        case 'Manajerial': return 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200';
        default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200'; // Petugas
    }
  }

  // Reset Filter
  const handleResetFilter = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
  };

  return (
    <div className="min-h-screen bg-white p-6 md:p-10 font-sans">
      <Navbar/>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#004aad]">Manajemen Pengguna</h1>
          <p className="text-muted-foreground">Kelola akun dan hak akses petugas gudang.</p>
        </div>

        {/* --- FORM CREATE USER --- */}
        <Card className="border-t-4 border-t-[#004aad] shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5"/> Tambah Pengguna Baru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label>Username (Login)</Label>
                <Input 
                  placeholder="user123" 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input 
                  type="password"
                  placeholder="******" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input 
                  placeholder="Budi Santoso" 
                  value={formData.fullname}
                  onChange={(e) => setFormData({...formData, fullname: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Role / Jabatan</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(val) => setFormData({...formData, role: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Petugas">Petugas Gudang</SelectItem>
                    <SelectItem value="Kepala Gudang">Kepala Gudang</SelectItem>
                    <SelectItem value="Manajerial">Manajerial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSubmit} disabled={isLoading} className="font-semibold bg-[#004aad]">
                {isLoading ? 'Menyimpan...' : '+ Tambah User'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* --- FILTER SECTION (Requested Feature) --- */}
        <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-gray-50 p-4 rounded-lg border">
            {/* Kiri: Search & Role */}
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-3/4">
                
                {/* 1. Search */}
                <div className="w-full md:w-1/2 space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 uppercase">Cari User</Label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input 
                            placeholder="Ketik username atau nama..." 
                            className="pl-9 bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* 2. Filter Role */}
                <div className="w-full md:w-1/3 space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 uppercase">Filter Role</Label>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="bg-white">
                             <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-gray-500"/>
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
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                    <X className="w-4 h-4 mr-2" /> Reset Filter
                </Button>
            )}
        </div>

        {/* --- TABLE USERS --- */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Daftar Pengguna</CardTitle>
            <Badge variant="outline" className="ml-2">
                Total: {filteredUsers.length} User
            </Badge>
          </CardHeader>
          <CardContent>
            {!data ? (
              <div className="text-center py-10 text-gray-500">Memuat data user...</div>
            ) : error ? (
              <div className="text-center py-10 text-red-500">Gagal mengambil data.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                            Tidak ada user yang cocok.
                        </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user: any) => (
                    <TableRow key={user.username}>
                      <TableCell className="font-mono font-medium">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                <User className="w-4 h-4"/>
                            </div>
                            {user.username}
                        </div>
                      </TableCell>
                      <TableCell>{user.fullname}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getRoleBadgeColor(user.role)} px-3 py-1`}>
                            {user.role === 'Kepala Gudang' && <Shield className="w-3 h-3 mr-1 inline"/>}
                            {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(user.username)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
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