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
import { AlertTriangle, TrendingUp, Package, Building2, LogOut, Loader2 } from "lucide-react";
import StockTrendChart from '../../components/StockTrendChart';
import WarehouseCompositionChart from '../../components/WarehouseCompositionChart'; // Import komponen
import { signOut } from "next-auth/react"; 

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const COLORS = ['#004aad', '#0078d4', '#429ce3', '#8ac5ff', '#FF8042'];

export default function AnalyticsPage() {
  // 1. Ambil state isLoading dari SWR
  const { data: productsData, isLoading: loadingProducts } = useSWR('/api/products', fetcher);
  const { data: transactionsData, isLoading: loadingTrx } = useSWR('/api/transactions', fetcher);
  const { data: deptsData, isLoading: loadingDepts } = useSWR('/api/departments', fetcher);

  // 2. Tampilkan Loader Full Screen jika data masih diambil
  if (loadingProducts || loadingTrx || loadingDepts) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-[#004aad]" />
            <p>Sedang menyiapkan dashboard...</p>
        </div>
    );
  }

  // 3. Olah Data (Hanya jalan jika loading selesai)
  const products = productsData?.data || [];
  const transactions = transactionsData?.data || [];
  const departments = deptsData?.data || [];

  // --- KPI LOGIC ---
  const totalItems = products.length;
  const totalStockQty = products.reduce((acc: number, item: any) => acc + item.stock, 0);
  const lowStockItems = products.filter((item: any) => item.stock < 10);

  const deptStats: Record<string, number> = {};
  products.forEach((item: any) => {
    const dept = item.department_id || 'Unknown';
    deptStats[dept] = (deptStats[dept] || 0) + item.stock;
  });
  
  const barChartData = Object.keys(deptStats).map(key => ({
    name: key,
    total: deptStats[key]
  }));

  const criticalStockList = lowStockItems.sort((a: any, b: any) => a.stock - b.stock).slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold text-[#004aad]">Dashboard</h1>
                <p className="text-gray-500">Pantau performa gudang secara real-time.</p>
            </div>
            
            <Button 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => signOut({ callbackUrl: '/login' })}
            >
                <LogOut className="w-4 h-4 mr-2" /> Keluar
            </Button>
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

          {/* <Card className={`shadow-sm border-l-4 ${lowStockItems.length > 0 ? 'border-l-red-500 bg-red-50' : 'border-l-green-500'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Perlu Restock 2</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{lowStockItems.length} <span className="text-xs font-normal">Item Kritis</span></div>
            </CardContent>
          </Card> */}
        </div>

        {/* --- SECTION 2: STOCK TREND CHART --- */}
        <div className="w-full">
            <StockTrendChart 
                products={products} 
                transactions={transactions} 
                departments={departments}
            />
        </div>

      {/* --- SECTION 4: TABLE INSIGHT --- */}
        <div className="">
          {/* Tabel Low Stock */}
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
                          <Badge variant="destructive">{item.stock} Unit</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* --- SECTION 3: WAREHOUSE COMPOSITION (FIXED) --- */}
        <div className="w-full">
             <WarehouseCompositionChart 
                products={products} 
                departments={departments} 
             />
        </div>

        

      </div>
    </div>
  );
}