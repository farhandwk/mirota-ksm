import Link from 'next/link';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Warehouse, ScanLine, ArrowRight } from "lucide-react";
import { redirect } from 'next/navigation';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      
      {/* Brand Section */}
      <div className="text-center mb-10 space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#004aad] rounded-2xl shadow-xl mb-4">
           <span className="text-white text-4xl font-extrabold">M</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#004aad] tracking-tight">
          Sistem Gudang Terpadu
        </h1>
        <p className="text-lg text-gray-500 max-w-lg mx-auto">
          Mirota KSM Inventory Management System. Kelola stok real-time dan monitoring aktivitas gudang.
        </p>
      </div>

      {/* Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        
        {/* Card 1: Kepala Gudang */}
        <Link href="/inventory" className="group">
          <Card className="h-full border-2 border-transparent hover:border-[#004aad] transition-all hover:shadow-xl cursor-pointer">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-blue-100 text-[#004aad] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Warehouse className="w-8 h-8" />
              </div>
              <CardTitle className="text-xl">Kepala Gudang</CardTitle>
              <CardDescription>Akses Dashboard & Laporan</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-500 mb-6 text-sm">
                Kelola master produk, pantau stok menipis, dan lihat riwayat audit log transaksi.
              </p>
              <Button className="w-full group-hover:bg-[#004aad]">
                Masuk Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        {/* Card 2: Petugas */}
        <Link href="/petugas" className="group">
          <Card className="h-full border-2 border-transparent hover:border-orange-500 transition-all hover:shadow-xl cursor-pointer">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <ScanLine className="w-8 h-8" />
              </div>
              <CardTitle className="text-xl">Petugas Lapangan</CardTitle>
              <CardDescription>Scanner Mobile</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-500 mb-6 text-sm">
                Akses scanner QR Code untuk pencatatan barang masuk dan barang keluar di lapangan.
              </p>
              <Button variant="outline" className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 group-hover:border-orange-500">
                Buka Scanner <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </Link>

      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-gray-400">
        &copy; 2025 Mirota KSM Tech Team. All rights reserved.
      </div>
    </div>
  );
  redirect('/inventory')
}