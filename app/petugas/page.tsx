'use client';

import Navbar from '../../components/Navbar';
import { Card, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { QrCode, Calculator, LogOut } from "lucide-react";
import Link from 'next/link';
import { signOut, useSession } from "next-auth/react"; 

export default function PetugasDashboard() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="max-w-md mx-auto p-6 space-y-8">
        <div className="bg-[#004aad] text-white p-6 rounded-2xl shadow-lg">
            <h1 className="text-2xl font-bold">Halo, {session?.user?.name || 'Petugas'}!</h1>
            <p className="text-blue-100 mt-1">Pilih aktivitas gudang hari ini.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
            {/* Menu ke Halaman Scanner (Kode Anda yang dipindah) */}
            <Link href="/petugas/scan">
                <Card className="hover:border-[#004aad] hover:shadow-md transition-all cursor-pointer border-l-4 border-l-orange-500 group">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-4 bg-orange-50 text-orange-600 rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-colors">
                            <QrCode className="w-8 h-8" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Scan Masuk/Keluar</CardTitle>
                            <CardDescription>Catat transaksi harian rutin</CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            </Link>

            {/* Menu ke Halaman Opname (Baru) */}
            <Link href="/petugas/opname">
                <Card className="hover:border-[#004aad] hover:shadow-md transition-all cursor-pointer border-l-4 border-l-[#004aad] group">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-4 bg-blue-50 text-[#004aad] rounded-xl group-hover:bg-[#004aad] group-hover:text-white transition-colors">
                            <Calculator className="w-8 h-8" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Stock Opname</CardTitle>
                            <CardDescription>Cek fisik & koreksi stok</CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            </Link>
        </div>

        <div className="pt-10">
            <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => signOut({ callbackUrl: '/login' })}>
                <LogOut className="w-4 h-4 mr-2" /> Keluar Aplikasi
            </Button>
        </div>
      </div>
    </div>
  );
}