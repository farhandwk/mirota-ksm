'use client';

import { useState } from 'react';
import useSWR from 'swr'; 
import QRScanner from '../../../components/QRScanner'; 
import { Button } from "../../../components/ui/button"; 
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Badge } from "../../../components/ui/badge";
import { ArrowLeft, PackagePlus, PackageMinus, Camera, LogOut, Loader2, ScanLine, QrCode } from "lucide-react"; 
import { signOut } from "next-auth/react";
import Link from 'next/link'; 

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ScanPage() {
  const { data: deptData } = useSWR('/api/departments', fetcher);

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<string>('IN');
  const [step, setStep] = useState<'SETUP' | 'SCANNING' | 'INPUT_QTY'>('SETUP');
  
  const [deptId, setDeptId] = useState('');
  const [scannedQR, setScannedQR] = useState('');
  const [qty, setQty] = useState<string>('1'); 
  const [isLoading, setIsLoading] = useState(false);

  // --- HANDLERS ---
  const handleStartScan = () => {
    if (activeTab === 'IN' && !deptId) {
      alert("Mohon pilih Departemen tujuan terlebih dahulu.");
      return;
    }
    setStep('SCANNING');
  };

  const onScanSuccess = (decodedText: string) => {
    setScannedQR(decodedText);
    setStep('INPUT_QTY');
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const payload = {
        qr_code: scannedQR,
        type: activeTab,
        quantity: Number(qty),
        department_id: activeTab === 'IN' ? deptId : undefined,
        petugas: "Petugas Gudang" 
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        alert(`SUKSES! \n${data.message}`);
        setStep('SETUP');
        setQty('1');
        setScannedQR('');
      } else {
        alert(`GAGAL: ${data.error}`);
        setStep('SETUP');
      }

    } catch (error) {
      alert("Terjadi kesalahan koneksi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setStep('SETUP');
    setDeptId('');
  };

  return (
    // 1. BACKGROUND GRADIENT (Dynamic based on Tab)
    <div className={`min-h-screen font-sans transition-colors duration-500 ${activeTab === 'IN' ? 'bg-gradient-to-br from-blue-50 via-white to-blue-100' : 'bg-gradient-to-br from-orange-50 via-white to-orange-100'}`}>
      
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

      <div className="w-full max-w-md mx-auto p-6 pt-24 pb-10 relative"> 
        
        {/* Dekorasi Background */}
        <div className="absolute top-20 right-4 opacity-10 pointer-events-none">
            <ScanLine className={`w-32 h-32 ${activeTab === 'IN' ? 'text-blue-600' : 'text-orange-600'}`} />
        </div>

        {/* --- HEADER --- */}
        <div className="mb-6 relative z-10">
          <h1 className={`text-3xl font-black tracking-tight ${activeTab === 'IN' ? 'text-[#004aad]' : 'text-orange-600'}`}>
            Scanner {activeTab === 'IN' ? 'Masuk' : 'Keluar'}
          </h1>
          <p className="text-gray-500 font-medium">Pastikan QR Code bersih dan terbaca.</p>
        </div>

        {/* --- MAIN CARD --- */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-md overflow-hidden relative ring-1 ring-white/60">
          
          {/* TAB INDICATOR BAR */}
          {step === 'SETUP' && (
             <div className="p-2 bg-gray-100/50 rounded-t-xl">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-14 bg-white/50 p-1 rounded-xl shadow-inner">
                    <TabsTrigger 
                        value="IN" 
                        className="rounded-lg text-base font-bold data-[state=active]:bg-[#004aad] data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                    >
                        <PackagePlus className="w-5 h-5 mr-2" />
                        Masuk
                    </TabsTrigger>
                    <TabsTrigger 
                        value="OUT" 
                        className="rounded-lg text-base font-bold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                    >
                        <PackageMinus className="w-5 h-5 mr-2" />
                        Keluar
                    </TabsTrigger>
                    </TabsList>
                </Tabs>
             </div>
          )}

          <CardContent className="p-6 space-y-6">
            
            {/* --- STEP 1: SETUP --- */}
            {step === 'SETUP' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'IN' ? (
                  <div className="space-y-2">
                    <Label className="text-gray-600 font-semibold ml-1">Pilih Departemen Tujuan</Label>
                    <Select value={deptId} onValueChange={setDeptId}>
                      <SelectTrigger className="h-14 text-lg bg-white border-gray-200 focus:ring-[#004aad] rounded-xl shadow-sm">
                        <SelectValue placeholder="Pilih Departemen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {!deptData ? (
                           <SelectItem value="loading" disabled>Memuat Data...</SelectItem>
                        ) : (
                           deptData.data?.map((dept: any) => (
                             <SelectItem key={dept.id} value={dept.id}>
                               {dept.nama}
                             </SelectItem>
                           ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-orange-800 text-sm font-medium flex gap-3 items-center">
                        <div className="p-2 bg-white rounded-full shadow-sm"><PackageMinus className="w-5 h-5 text-orange-500"/></div>
                        Barang yang discan akan otomatis mengurangi stok sistem.
                    </div>
                )}

                <Button 
                    onClick={handleStartScan} 
                    className={`w-full h-16 text-xl font-bold rounded-2xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all ${activeTab === 'IN' ? 'bg-[#004aad] hover:bg-blue-900' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-900/20'}`}
                >
                  <Camera className="mr-3 h-6 w-6" />
                  Mulai Scan
                </Button>
              </div>
            )}

            {/* --- STEP 2: SCANNING --- */}
            {step === 'SCANNING' && (
              <div className="flex flex-col items-center space-y-6 animate-in zoom-in-95 duration-300">
                <div className="w-full aspect-square bg-black rounded-3xl overflow-hidden relative shadow-2xl border-4 border-white ring-4 ring-blue-100">
                  <QRScanner onScanSuccess={onScanSuccess} />
                  
                  {/* Overlay Scanner Animation */}
                  <div className="absolute inset-0 pointer-events-none border-[30px] border-black/30 rounded-3xl"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/50 rounded-lg">
                      <div className="w-full h-1 bg-red-500/80 absolute top-1/2 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                  </div>
                </div>
                
                <p className="text-center text-gray-500 animate-pulse font-medium">Arahkan kamera ke QR Code barang</p>

                <Button variant="outline" onClick={() => setStep('SETUP')} className="w-full h-12 rounded-xl border-gray-300 text-gray-600 hover:bg-gray-100 font-bold">
                  <ArrowLeft className="mr-2 h-5 w-5" /> Batalkan
                </Button>
              </div>
            )}

            {/* --- STEP 3: INPUT QUANTITY --- */}
            {step === 'INPUT_QTY' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-10 duration-500">
                
                {/* Product Ticket */}
                <div className="bg-slate-50 p-5 rounded-2xl text-center border-2 border-dashed border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#004aad] to-transparent opacity-50"></div>
                  <QrCode className="w-8 h-8 text-gray-300 mx-auto mb-2"/>
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Kode Terdeteksi</p>
                  <p className="text-2xl font-mono font-black text-gray-800 break-all tracking-tight">{scannedQR}</p>
                </div>

                <div className="space-y-4">
                  <Label className="text-center block text-gray-600 font-medium text-lg">
                      Masukkan Jumlah <span className={activeTab === 'IN' ? 'text-blue-600' : 'text-orange-600'}>{activeTab === 'IN' ? 'Masuk' : 'Keluar'}</span>
                  </Label>
                  <div className="flex items-center justify-center">
                    <Input 
                      type="number" 
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className={`text-center text-5xl font-black h-24 w-48 rounded-2xl border-2 focus-visible:ring-4 transition-all shadow-inner bg-white ${activeTab === 'IN' ? 'border-blue-200 focus-visible:ring-blue-100 text-[#004aad]' : 'border-orange-200 focus-visible:ring-orange-100 text-orange-600'}`}
                      onFocus={(e) => e.target.select()}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('SETUP')} 
                    disabled={isLoading} 
                    className="h-14 rounded-xl border-gray-300 text-gray-600 hover:bg-gray-50 font-bold"
                  >
                    Batal
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isLoading} 
                    className={`h-14 rounded-xl font-bold text-lg text-white shadow-lg active:scale-95 transition-all ${activeTab === 'IN' ? 'bg-[#004aad] hover:bg-blue-900 shadow-blue-900/20' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-900/20'}`}
                  >
                    {isLoading ? <Loader2 className="animate-spin w-6 h-6"/> : 'Simpan Data'}
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

      </div>
    </div>
  );
}