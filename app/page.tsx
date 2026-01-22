import Link from 'next/link';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Warehouse, ScanLine, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    // 1. BACKGROUND GRADIENT (Sama seperti Login)
    <div className="min-h-screen bg-gradient-to-br from-[#004aad] via-[#004aad]/30 to-white flex flex-col items-center justify-center p-6 font-sans">
      
      {/* Brand Section - Dengan Animasi */}
      <div className="text-center mb-12 space-y-4 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Logo M dalam Glass Container */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-md border border-white/40 rounded-3xl shadow-2xl mb-4 ring-1 ring-white/50">
           <span className="text-white text-5xl font-black drop-shadow-md">M</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-sm">
          Sistem Gudang Terpadu
        </h1>
        <p className="text-lg md:text-xl text-blue-100/90 max-w-lg mx-auto font-medium">
          Mirota KSM Inventory Management System. <br/>Kelola stok real-time dan monitoring aktivitas gudang.
        </p>
      </div>

      {/* Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        
        {/* Card 1: Kepala Gudang */}
        <Link href="/analytics" className="group w-full">
          {/* GLASS CARD EFFECT */}
          <Card className="h-full bg-white/70 backdrop-blur-md border-white/50 border-t-4 border-t-[#004aad] shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 animate-in slide-in-from-bottom-10 fade-in duration-700 delay-100 flex flex-col justify-between">
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 bg-blue-100/80 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-[#004aad] group-hover:text-white transition-colors duration-300 shadow-inner">
                <Warehouse className="w-10 h-10" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-800">Kepala Gudang</CardTitle>
              <CardDescription className="text-gray-600 font-medium">Dashboard & Laporan Pusat</CardDescription>
            </CardHeader>
            <CardContent className="text-center px-8 pb-8">
              <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                Kelola master produk, pantau stok menipis, approval opname, dan lihat riwayat audit log transaksi secara real-time.
              </p>
              <Button className="w-full bg-[#004aad] hover:bg-blue-900 text-white shadow-lg shadow-blue-900/20 group-hover:scale-105 transition-transform">
                Masuk Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        {/* Card 2: Petugas */}
        <Link href="/petugas" className="group w-full">
          {/* GLASS CARD EFFECT (Varian Orange) */}
          <Card className="h-full bg-white/70 backdrop-blur-md border-white/50 border-t-4 border-t-orange-500 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 animate-in slide-in-from-bottom-10 fade-in duration-700 delay-200 flex flex-col justify-between">
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 bg-orange-100/80 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300 shadow-inner">
                <ScanLine className="w-10 h-10" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-800">Petugas Lapangan</CardTitle>
              <CardDescription className="text-gray-600 font-medium">Scanner Mobile & Opname</CardDescription>
            </CardHeader>
            <CardContent className="text-center px-8 pb-8">
              <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                Akses scanner QR Code cepat untuk pencatatan barang masuk/keluar dan melakukan input stock opname di lapangan.
              </p>
              <Button variant="outline" className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 shadow-sm group-hover:scale-105 transition-transform">
                Buka Scanner <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </Link>

      </div>

      {/* Footer */}
      <div className="mt-16 text-center text-sm text-blue-900/60 font-medium">
        &copy; 2025 Mirota KSM Tech Team. All rights reserved.
      </div>
    </div>
  );
}