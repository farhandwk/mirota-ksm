'use client';

import Navbar from '../../components/Navbar';
import useSWR from 'swr';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { AlertTriangle, TrendingUp, Package, Building2 } from "lucide-react";
import StockTrendChart from '../../components/StockTrendChart';
import { signOut } from "next-auth/react"; 
import { LogOut } from "lucide-react";

// Fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Warna Chart (Biru Mirota & Variasinya)
const COLORS = ['#004aad', '#0078d4', '#429ce3', '#8ac5ff', '#FF8042'];

export default function AnalyticsPage() {
  // Ambil data Produk & Transaksi sekaligus
  const { data: productsData } = useSWR('/api/products', fetcher);
  const { data: transactionsData } = useSWR('/api/transactions', fetcher);

  // --- DATA PROCESSING LOGIC ---
  
  if (!productsData || !transactionsData) {
    return <div className="p-10 text-center text-gray-500">Sedang menghitung analitik...</div>;
  }

  const products = productsData?.data || [];
  const transactions = transactionsData?.data || [];
  
  // 1. KPI Calculation
  const totalItems = products.length;
  const totalStockQty = products.reduce((acc: number, item: any) => acc + item.stock, 0);
  const lowStockItems = products.filter((item: any) => item.stock < 10); // Stok di bawah 10 dianggap kritis

  // 2. Group by Department (Untuk Bar Chart)
  const deptStats: Record<string, number> = {};
  products.forEach((item: any) => {
    const dept = item.department_id || 'Unknown';
    deptStats[dept] = (deptStats[dept] || 0) + item.stock;
  });
  
  const barChartData = Object.keys(deptStats).map(key => ({
    name: key,
    total: deptStats[key]
  }));

  // 3. Low Stock List (Insight Actionable)
  const criticalStockList = lowStockItems.sort((a: any, b: any) => a.stock - b.stock).slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold text-[#004aad]">Dashboard Analytics</h1>
                <p className="text-gray-500">Pantau performa gudang secara real-time.</p>
            </div>
            
            {/* Tombol Logout Manual (Hanya muncul jika Navbar tidak ada/Manager) */}
            <Button 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => signOut({ callbackUrl: '/login' })}
            >
                <LogOut className="w-4 h-4 mr-2" /> Keluar
            </Button>
        </div>
        
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#004aad]">Executive Dashboard</h1>
          <p className="text-muted-foreground">Ringkasan performa inventaris dan peringatan dini.</p>
        </div>

        {/* --- SECTION 1: KPI CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm border-l-4 border-l-[#004aad]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jenis Produk</CardTitle>
              <Package className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems} <span className="text-xs font-normal text-gray-500">SKU</span></div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-blue-400">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Fisik Aset</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStockQty} <span className="text-xs font-normal text-gray-500">Unit</span></div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-indigo-400">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departemen Aktif</CardTitle>
              <Building2 className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(deptStats).length} <span className="text-xs font-normal text-gray-500">Divisi</span></div>
            </CardContent>
          </Card>

          <Card className={`shadow-sm border-l-4 ${lowStockItems.length > 0 ? 'border-l-red-500 bg-red-50' : 'border-l-green-500'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Perlu Restock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{lowStockItems.length} <span className="text-xs font-normal">Item Kritis</span></div>
            </CardContent>
          </Card>
        </div>

        <StockTrendChart 
               products={products} 
               transactions={transactions} 
            />

        {/* --- SECTION 2: CHARTS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Chart 1: Distribusi Stok per Dept */}
          <Card>
            <CardHeader>
              <CardTitle>Distribusi Stok per Departemen</CardTitle>
              <CardDescription>Divisi mana yang menyimpan barang terbanyak?</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f3f4f6' }}
                  />
                  <Bar dataKey="total" fill="#004aad" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Chart 2: Top 5 Barang Menipis (Tabel Insight) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Prioritas Belanja (Stok &lt; 10)
              </CardTitle>
              <CardDescription>Barang-barang ini harus segera dipesan ulang.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead>Dept</TableHead>
                    <TableHead className="text-right">Sisa Stok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalStockList.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={3} className="text-center text-green-600 py-8">
                         Semua stok aman! Tidak ada yang kritis.
                       </TableCell>
                     </TableRow>
                  ) : (
                    criticalStockList.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell><Badge variant="outline">{item.department_id}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">{item.stock} {item.unit}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>

        {/* --- SECTION 3: PIE CHART COMPOSITION --- */}
        <Card>
            <CardHeader>
              <CardTitle>Komposisi Gudang</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={barChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="total"
                  >
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}