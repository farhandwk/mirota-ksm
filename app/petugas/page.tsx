'use client';

import Navbar from '../../components/Navbar';
import { Card, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { QrCode, Calculator, LogOut, User, ChevronRight, ScanLine } from "lucide-react";
import Link from 'next/link';
import { signOut, useSession } from "next-auth/react"; 

export default function PetugasDashboard() {
  const { data: session } = useSession();

  return (
    // 1. BACKGROUND GRADIENT (Mobile Friendly)
    <div className="min-h-screen bg-gradient-to-br from-[#004aad]/10 via-white to-orange-50 font-sans pb-10">
      <Navbar />
      
      <div className="max-w-md mx-auto p-6 space-y-8 pt-24">
        
        {/* --- WELCOME CARD (GLASS) --- */}
        <div className="bg-[#004aad] text-white p-8 rounded-3xl shadow-xl shadow-blue-900/20 relative overflow-hidden">
            {/* Dekorasi BG */}
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <ScanLine className="w-32 h-32 text-white" />
            </div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2 opacity-90">
                    <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-full">
                        <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium tracking-wide uppercase">Petugas Lapangan</span>
                </div>
                <h1 className="text-3xl font-black tracking-tight leading-tight">
                    Halo, <br/> {session?.user?.name || 'Petugas'}!
                </h1>
                <p className="text-blue-100 mt-2 text-sm font-medium">
                    Silakan pilih aktivitas gudang Anda hari ini.
                </p>
            </div>
        </div>

        {/* --- MENU GRID --- */}
        <div className="grid grid-cols-1 gap-5">
            
            {/* Menu 1: Scanner (Orange Theme) */}
            <Link href="/petugas/scan" className="group">
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-md hover:bg-orange-50/50 transition-all duration-300 relative overflow-hidden ring-1 ring-orange-100 hover:ring-orange-300 active:scale-95">
                    <div className="absolute right-0 top-0 h-full w-2 bg-orange-500 rounded-l-full" />
                    <CardHeader className="flex flex-row items-center gap-5 p-6">
                        <div className="p-4 bg-orange-100 text-orange-600 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                            <QrCode className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-xl font-bold text-gray-800 group-hover:text-orange-700 transition-colors">
                                Scan QR Code
                            </CardTitle>
                            <CardDescription className="text-gray-500 font-medium">
                                Pencatatan barang masuk & keluar (IN/OUT)
                            </CardDescription>
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-orange-400 transition-colors" />
                    </CardHeader>
                </Card>
            </Link>

            {/* Menu 2: Opname (Blue Theme) */}
            <Link href="/petugas/opname" className="group">
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-md hover:bg-blue-50/50 transition-all duration-300 relative overflow-hidden ring-1 ring-blue-100 hover:ring-[#004aad]/50 active:scale-95">
                    <div className="absolute right-0 top-0 h-full w-2 bg-[#004aad] rounded-l-full" />
                    <CardHeader className="flex flex-row items-center gap-5 p-6">
                        <div className="p-4 bg-blue-100 text-[#004aad] rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                            <Calculator className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-xl font-bold text-gray-800 group-hover:text-[#004aad] transition-colors">
                                Stock Opname
                            </CardTitle>
                            <CardDescription className="text-gray-500 font-medium">
                                Cek fisik & koreksi selisih stok gudang
                            </CardDescription>
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-[#004aad] transition-colors" />
                    </CardHeader>
                </Card>
            </Link>
        </div>

        {/* --- LOGOUT BUTTON --- */}
        <div className="pt-8">
            <Button 
                variant="outline" 
                className="w-full h-12 rounded-xl text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 shadow-sm font-bold text-base transition-all active:scale-95" 
                onClick={() => signOut({ callbackUrl: '/login' })}
            >
                <LogOut className="w-5 h-5 mr-2" /> Keluar Aplikasi
            </Button>
            <p className="text-center text-xs text-gray-400 mt-6 font-medium">
                &copy; 2025 Mirota KSM Tech Team
            </p>
        </div>

      </div>
    </div>
  );
}