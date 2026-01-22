'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import Navbar from '../../../components/Navbar'; // Opsional jika ingin navbar bawah, tapi biasanya full page lebih fokus
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Loader2, Save, ArrowLeft, CheckCircle2, AlertTriangle, Calculator, LogOut, PackageSearch } from "lucide-react";
import Link from 'next/link';
import { signOut } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function OpnameCalculatorPage() {
  const { data: session } = useSession();
  const { data: productsData, isLoading } = useSWR('/api/products', fetcher);
  
  const [selectedProductId, setSelectedProductId] = useState("");
  const [stokFisik, setStokFisik] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  const products = productsData?.data || [];

  const selectedProduct = useMemo(() => products.find((p: any) => p.id === selectedProductId), [products, selectedProductId]);
  const stokSistem = selectedProduct ? parseInt(selectedProduct.stock) : 0;
  const fisikNum = stokFisik === "" ? 0 : parseInt(stokFisik);
  const selisih = selectedProduct && stokFisik !== "" ? (fisikNum - stokSistem) : 0;

  const handleSave = async () => {
    if (!selectedProduct || stokFisik === "") return;
    setIsSubmitting(true);
    setStatusMsg(null);

    try {
        const res = await fetch('/api/petugas/opname', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                kode_qr: selectedProduct.qr_code,
                nama_produk: selectedProduct.name,
                stok_sistem: stokSistem,
                stok_fisik: fisikNum,
                petugas: session?.user?.name || "Petugas Lapangan"
            })
        });

        if (res.ok) {
            setStatusMsg({ type: 'success', text: 'Tersimpan! Menunggu Approval.' });
            setTimeout(() => {
                setStatusMsg(null);
                setStokFisik("");
                setSelectedProductId("");
            }, 1500);
        } else {
            setStatusMsg({ type: 'error', text: 'Gagal menyimpan data.' });
        }
    } catch (e) {
        setStatusMsg({ type: 'error', text: 'Terjadi kesalahan koneksi.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- LOADING STATE ---
  if (isLoading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 text-[#004aad]">
            <Loader2 className="w-10 h-10 animate-spin mb-2" />
            <p className="font-medium animate-pulse">Memuat data produk...</p>
        </div>
      );
  }

  return (
    // 1. BACKGROUND GRADIENT (Mobile Friendly)
    <div className="min-h-screen bg-gradient-to-br from-[#004aad]/10 via-white to-blue-50 font-sans pb-10">
      
      {/* --- TOP BAR (GLASS) --- */}
      <div className="fixed top-0 w-full z-20 flex justify-between items-center p-4 bg-white/60 backdrop-blur-md border-b border-white/50 shadow-sm">
        <Link href="/petugas">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-full">
                <ArrowLeft className="w-5 h-5 mr-1" /> Kembali
            </Button>
        </Link>
        <Button 
            variant="ghost" 
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
            onClick={() => signOut({ callbackUrl: '/login' })}
        >
            <LogOut className="w-5 h-5" />
        </Button>
      </div>

      <div className="w-full max-w-md mx-auto p-6 pt-24 relative">
        
        {/* Dekorasi Background */}
        <div className="absolute top-20 right-6 opacity-10 pointer-events-none">
            <Calculator className="w-32 h-32 text-[#004aad]" />
        </div>

        {/* --- HEADER --- */}
        <div className="mb-6 relative z-10">
          <h1 className="text-3xl font-black tracking-tight text-[#004aad]">
            Input Stock Opname
          </h1>
          <p className="text-gray-500 font-medium">Hitung fisik barang dan sesuaikan dengan sistem.</p>
        </div>

        {/* --- MAIN CARD --- */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-md overflow-hidden relative ring-1 ring-white/60">
            {/* Status Message Overlay */}
            {statusMsg && (
                <div className={`absolute top-0 left-0 w-full p-4 flex items-center justify-center gap-2 text-sm font-bold text-white z-20 animate-in slide-in-from-top-2 ${statusMsg.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                    {statusMsg.text}
                </div>
            )}

            <CardContent className="p-6 space-y-6 pt-8">
                
                {/* 1. SELECT PRODUCT */}
                <div className="space-y-2">
                    <Label className="text-gray-600 font-semibold ml-1">Pilih Barang / SKU</Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger className="h-14 text-lg bg-white border-gray-200 focus:ring-[#004aad] rounded-xl shadow-sm">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <PackageSearch className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                <SelectValue placeholder="Cari barang..." />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            {products.map((p: any) => (
                                <SelectItem key={p.id} value={p.id} className="py-3">
                                    <span className="font-medium">{p.name}</span>
                                    <span className="block text-xs text-gray-400 font-mono">{p.qr_code}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* 2. COMPARISON GRID (SYSTEM VS PHYSICAL) */}
                <div className="grid grid-cols-2 gap-4">
                    
                    {/* System Stock (Read Only) */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase font-bold text-center block tracking-wider">Stok Sistem</Label>
                        <div className="h-20 bg-gray-100 rounded-2xl flex flex-col items-center justify-center border border-gray-200 shadow-inner">
                            <span className="text-3xl font-black text-gray-500">
                                {selectedProductId ? stokSistem : "-"}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">Unit</span>
                        </div>
                    </div>

                    {/* Physical Stock (Input) */}
                    <div className="space-y-2">
                        <Label className="text-xs text-[#004aad] uppercase font-bold text-center block tracking-wider">Stok Fisik</Label>
                        <Input 
                            type="number" 
                            placeholder="0" 
                            className="h-20 text-center text-4xl font-black border-2 border-[#004aad] text-[#004aad] rounded-2xl focus-visible:ring-4 focus-visible:ring-blue-100 bg-white shadow-sm"
                            value={stokFisik} 
                            onChange={(e) => setStokFisik(e.target.value)} 
                            disabled={!selectedProductId}
                            onFocus={(e) => e.target.select()} // Auto select
                        />
                    </div>
                </div>

                {/* 3. DIFFERENCE INDICATOR (Dynamic) */}
                <div className={`transition-all duration-500 overflow-hidden ${selectedProductId && stokFisik !== "" ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className={`p-4 rounded-xl border-2 flex justify-between items-center shadow-sm ${selisih === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${selisih === 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                                {selisih === 0 ? <CheckCircle2 className="w-6 h-6"/> : <AlertTriangle className="w-6 h-6"/>}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-wide opacity-80">Status</span>
                                <span className="font-bold">{selisih === 0 ? "COCOK" : "SELISIH"}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold uppercase tracking-wide opacity-80 block">Jumlah</span>
                            <span className="text-3xl font-black">{selisih > 0 ? "+" : ""}{selisih}</span>
                        </div>
                    </div>
                </div>

                {/* 4. SUBMIT BUTTON */}
                <Button 
                    className="w-full h-14 text-lg font-bold bg-[#004aad] hover:bg-blue-900 shadow-lg shadow-blue-900/20 active:scale-95 transition-all rounded-xl" 
                    disabled={!selectedProductId || stokFisik === "" || isSubmitting} 
                    onClick={handleSave}
                >
                    {isSubmitting ? <Loader2 className="w-6 h-6 mr-2 animate-spin"/> : <Save className="w-6 h-6 mr-2"/>} 
                    Simpan Laporan
                </Button>

            </CardContent>
        </Card>
      </div>
    </div>
  );
}