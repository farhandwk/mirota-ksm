'use client';

import { useState } from 'react';
import useSWR from 'swr'; 
import QRScanner from '../../../components/QRScanner'; // Pastikan path ini sesuai struktur folder Anda
import { Button } from "../../../components/ui/button"; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Badge } from "../../../components/ui/badge";
import { ArrowLeft, CheckCircle, PackagePlus, PackageMinus, Camera, LogOut } from "lucide-react"; 
import { signOut } from "next-auth/react";
import Link from 'next/link'; // Import Link untuk navigasi kembali

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
        petugas: "Petugas Gudang" // Bisa diganti session.user.name jika ada
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
    <div className="min-h-screen bg-gray-50 p-4 font-sans flex items-center justify-center relative">
      
      {/* --- TOMBOL KEMBALI (BARU) --- */}
      <div className="absolute top-4 left-4">
        <Link href="/petugas">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-200">
                <ArrowLeft className="w-5 h-5 mr-2" /> Kembali
            </Button>
        </Link>
      </div>

      {/* --- TOMBOL KELUAR (TETAP SAMA) --- */}
      <div className="absolute top-4 right-4">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="w-5 h-5 mr-2" /> Keluar
          </Button>
      </div>

      <div className="w-full max-w-md space-y-6 mt-12"> {/* Tambah margin top agar tidak nabrak tombol */}
        
        {/* HEADER */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#004aad]">Scanner Transaksi</h1>
          <p className="text-sm text-muted-foreground">Catat Barang Masuk & Keluar</p>
        </div>

        {/* TABS MODE SWITCHER */}
        {step === 'SETUP' && (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-14">
              <TabsTrigger value="IN" className="text-base font-semibold data-[state=active]:text-[#004aad]">
                <PackagePlus className="w-4 h-4 mr-2" />
                Barang Masuk
              </TabsTrigger>
              <TabsTrigger value="OUT" className="text-base font-semibold data-[state=active]:text-orange-600">
                <PackageMinus className="w-4 h-4 mr-2" />
                Barang Keluar
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* MAIN CARD CONTENT */}
        <Card className="shadow-lg border-t-4 border-t-[#004aad]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>
                {step === 'SETUP' && "Persiapan Scan"}
                {step === 'SCANNING' && "Scanning..."}
                {step === 'INPUT_QTY' && "Konfirmasi Jumlah"}
              </CardTitle>
              <Badge variant={activeTab === 'IN' ? 'default' : 'destructive'} className={activeTab === 'OUT' ? 'bg-orange-500 hover:bg-orange-600' : ''}>
                MODE: {activeTab === 'IN' ? 'IN' : 'OUT'}
              </Badge>
            </div>
            <CardDescription>
              {step === 'SETUP' && (activeTab === 'IN' ? "Pilih departemen sebelum scan barang masuk." : "Scan barang untuk dikeluarkan dari stok.")}
              {step === 'SCANNING' && "Arahkan kamera ke QR Code barang."}
              {step === 'INPUT_QTY' && "Masukkan jumlah fisik barang."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            
            {/* --- STEP 1: SETUP --- */}
            {step === 'SETUP' && (
              <div className="space-y-4">
                {activeTab === 'IN' && (
                  <div className="space-y-2">
                    <Label>Departemen Tujuan</Label>
                    <Select value={deptId} onValueChange={setDeptId}>
                      <SelectTrigger className="h-12 text-lg">
                        <SelectValue placeholder="Pilih Departemen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {!deptData ? (
                           <SelectItem value="loading" disabled>Memuat Data...</SelectItem>
                        ) : (
                           deptData.data?.map((dept: any) => (
                             <SelectItem key={dept.id} value={dept.id}>
                               {dept.nama} ({dept.id})
                             </SelectItem>
                           ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="pt-4">
                  <Button onClick={handleStartScan} className="w-full h-14 text-lg font-bold shadow-md bg-[#004aad] hover:bg-blue-800">
                    <Camera className="mr-2 h-6 w-6" />
                    Mulai Kamera
                  </Button>
                </div>
              </div>
            )}

            {/* --- STEP 2: SCANNING --- */}
            {step === 'SCANNING' && (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-full aspect-square bg-black rounded-lg overflow-hidden relative">
                  <QRScanner onScanSuccess={onScanSuccess} />
                </div>
                <Button variant="outline" onClick={() => setStep('SETUP')} className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Batal
                </Button>
              </div>
            )}

            {/* --- STEP 3: INPUT QUANTITY --- */}
            {step === 'INPUT_QTY' && (
              <div className="space-y-6">
                <div className="bg-slate-100 p-4 rounded-lg text-center border border-slate-200">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">Kode Terdeteksi</p>
                  <p className="text-xl font-mono font-bold text-[#004aad] break-all">{scannedQR}</p>
                </div>

                <div className="space-y-3">
                  <Label className="text-center block text-base">Jumlah {activeTab === 'IN' ? 'Diterima' : 'Keluar'}</Label>
                  <div className="flex items-center justify-center">
                    <Input 
                      type="number" 
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="text-center text-4xl font-bold h-20 w-40 border-2 border-[#004aad] focus-visible:ring-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep('SETUP')} disabled={isLoading} className="h-12">
                    Batal
                  </Button>
                  <Button onClick={handleSubmit} disabled={isLoading} className="h-12 font-bold bg-[#004aad] hover:bg-blue-800">
                    {isLoading ? 'Proses...' : 'Simpan'} <CheckCircle className="ml-2 h-4 w-4" />
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