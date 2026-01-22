'use client';

import Navbar from '../../components/Navbar';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { 
  AlertTriangle, Package, Building2, LogOut, Loader2, 
  TrendingUp, RefreshCw, ArrowUpRight, Box 
} from "lucide-react";
import StockTrendChart from '../../components/StockTrendChart';
import WarehouseCompositionChart from '../../components/WarehouseCompositionChart';
import { signOut } from "next-auth/react"; 
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AnalyticsPage() {
  const { data: productsData, isLoading: loadingProducts, mutate: refreshProducts } = useSWR('/api/products', fetcher);
  const { data: transactionsData, isLoading: loadingTrx, mutate: refreshTrx } = useSWR('/api/transactions', fetcher);
  const { data: deptsData, isLoading: loadingDepts } = useSWR('/api/departments', fetcher);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual Refresh Handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshProducts(), refreshTrx()]);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  if (loadingProducts || loadingTrx || loadingDepts) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white text-[#004aad] gap-3">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="font-medium animate-pulse">Menyiapkan dashboard...</p>
        </div>
    );
  }

  // --- DATA PROCESSING ---
  const products = productsData?.data || [];
  const transactions = transactionsData?.data || [];
  const departments = deptsData?.data || [];

  const totalItems = products.length;
  const totalStockQty = products.reduce((acc: number, item: any) => acc + item.stock, 0);
  const lowStockItems = products.filter((item: any) => item.stock < 10);
  
  // Sort critical items by stock (lowest first)
  const criticalStockList = lowStockItems.sort((a: any, b: any) => a.stock - b.stock).slice(0, 5);

  const deptStats: Record<string, number> = {};
  products.forEach((item: any) => {
    const dept = item.department_id || 'Unknown';
    deptStats[dept] = (deptStats[dept] || 0) + item.stock;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#004aad]/5 via-white to-blue-50 font-sans pb-20">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 pt-24">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm">
            <div>
                <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight">Dashboard Overview</h1>
                <p className="text-gray-500 mt-1">Pantau kesehatan stok dan performa gudang secara real-time.</p>
            </div>
            
            <div className="flex gap-3">
                <Button 
                    variant="outline" 
                    onClick={handleRefresh}
                    className="bg-white hover:bg-gray-50 text-gray-600 border-gray-200 shadow-sm"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> 
                    Refresh Data
                </Button>
                <Button 
                    variant="destructive" 
                    className="bg-red-600 hover:bg-red-700 shadow-red-200 shadow-lg"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                >
                    <LogOut className="w-4 h-4 mr-2" /> Keluar
                </Button>
            </div>
        </div>

        {/* --- SECTION 1: KPI CARDS (Glassmorphism) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Total SKU */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-md hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Package className="w-24 h-24 text-blue-600" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Produk</CardTitle>
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Package className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-gray-800">{totalItems}</div>
              <p className="text-xs text-green-600 flex items-center mt-1 font-medium">
                 <ArrowUpRight className="w-3 h-3 mr-1"/> SKU Aktif
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Total Aset */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-md hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Box className="w-24 h-24 text-emerald-600" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Fisik</CardTitle>
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <TrendingUp className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-gray-800">{totalStockQty.toLocaleString()}</div>
              <p className="text-xs text-gray-400 mt-1 font-medium">Unit barang dalam gudang</p>
            </CardContent>
          </Card>

          {/* Card 3: Departemen */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-md hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Building2 className="w-24 h-24 text-indigo-600" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Departemen</CardTitle>
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Building2 className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-gray-800">{Object.keys(deptStats).length}</div>
              <p className="text-xs text-gray-400 mt-1 font-medium">Divisi pemilik barang</p>
            </CardContent>
          </Card>

          {/* Card 4: Low Stock (Alert) */}
          <Card className={`border-0 shadow-lg hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative ${lowStockItems.length > 0 ? 'bg-red-50/80 ring-2 ring-red-100' : 'bg-white/80'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <AlertTriangle className="w-24 h-24 text-red-600" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-red-600 uppercase tracking-wider">Perlu Restock</CardTitle>
              <div className={`p-2 rounded-lg ${lowStockItems.length > 0 ? 'bg-red-200 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                  <AlertTriangle className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-black ${lowStockItems.length > 0 ? 'text-red-700' : 'text-gray-800'}`}>
                  {lowStockItems.length}
              </div>
              <p className="text-xs text-red-500 mt-1 font-bold">
                 {lowStockItems.length > 0 ? "Item di bawah batas aman!" : "Semua stok aman"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* --- SECTION 2: STOCK TREND CHART --- */}
        <div className="w-full bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/60 p-1">
            <StockTrendChart 
                products={products} 
                transactions={transactions} 
                departments={departments}
            />
        </div>

        {/* --- SECTION 3: SPLIT VIEW (PIE + TABLE) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Warehouse Composition */}
            <div className="lg:col-span-1 h-full">
                 <WarehouseCompositionChart 
                    products={products} 
                    departments={departments} 
                 />
            </div>

            {/* Right: Critical Stock Table */}
            <Card className="lg:col-span-2 border-0 shadow-lg bg-white/80 backdrop-blur-md flex flex-col">
              <CardHeader className="border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold text-gray-800">Prioritas Belanja</CardTitle>
                        <CardDescription>Barang dengan stok kritis (&lt; 10 unit) yang harus segera dipesan.</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-auto flex-1">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="pl-6">Nama Produk</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead className="text-center">Level Stok</TableHead>
                      <TableHead className="text-right pr-6">Sisa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {criticalStockList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12">
                            <div className="flex flex-col items-center gap-2 text-green-600">
                                <Package className="w-8 h-8 opacity-50"/>
                                <span className="font-medium">Stok Aman! Tidak ada yang kritis.</span>
                            </div>
                          </TableCell>
                        </TableRow>
                    ) : (
                      criticalStockList.map((item: any) => {
                        // Kalkulasi persentase stok untuk progress bar (Max 20 biar bar penuh kalau >= 20, tapi ini konteksnya <10)
                        const percentage = Math.min((item.stock / 10) * 100, 100);
                        
                        return (
                        <TableRow key={item.id} className="hover:bg-red-50/30 transition-colors">
                          <TableCell className="pl-6 font-medium text-gray-800">
                              {item.name}
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.qr_code}</div>
                          </TableCell>
                          <TableCell>
                              <Badge variant="outline" className="bg-white border-gray-200 text-gray-600 font-normal">
                                  {item.department_id}
                              </Badge>
                          </TableCell>
                          <TableCell className="w-32">
                              {/* Visual Progress Bar untuk Stok */}
                              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${item.stock === 0 ? 'bg-gray-300' : 'bg-red-500'}`} 
                                    style={{ width: `${percentage}%` }}
                                  />
                              </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <span className={`font-bold ${item.stock === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                                {item.stock}
                            </span> 
                            <span className="text-xs text-gray-400 ml-1">Unit</span>
                          </TableCell>
                        </TableRow>
                      )})
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}