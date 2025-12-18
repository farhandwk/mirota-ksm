'use client';

import { useSession, signOut } from "next-auth/react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from "../components/ui/button";
import { Package, History, LogOut, ChartPie, Building2, Scale, Users, ClipboardList, Warehouse } from "lucide-react";
import mirota from "../src/logo.png"
import Image from "next/image"

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession(); // Hook session

  // 1. Ambil Role
  const userRole = session?.user?.role;
  
  // 2. LOGIKA SEMBUNYIKAN NAVBAR
  // Navbar HANYA muncul untuk "Kepala Gudang".
  // Jika Manajerial atau Petugas login, navbar hilang (return null).
  if (!session || userRole === 'Manajerial' || userRole === 'Petugas') {
    return null;
  }

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 flex flex-wrap">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-4">
          
          <div className="flex-shrink-0 flex items-center gap-2">
            <Image
               src={mirota}
               alt="logo mirota"
               width={100}
               />
          </div>

          {/* Menu Links (Hanya Kepala Gudang yang lihat ini) */}
          <div className="hidden md:flex space-x-2">
            <Link href="/inventory">
              <Button variant={isActive('/inventory') ? 'default' : 'ghost'} className={isActive('/inventory') ? 'bg-[#004aad]' : 'text-gray-600 hover:text-[#004aad] hover:bg-blue-50'}>
                <Package className="w-4 h-4 mr-2" /> Stok
              </Button>
            </Link>
            <Link href="/history">
              <Button variant={isActive('/history') ? 'default' : 'ghost'} className={isActive('/history') ? 'bg-[#004aad]' : 'text-gray-600 hover:text-[#004aad] hover:bg-blue-50'}>
                <History className="w-4 h-4 mr-2" /> Riwayat
              </Button>
            </Link>
            <Link href="/gudang">
              <Button variant={isActive('/departments') ? 'default' : 'ghost'} className={isActive('/gudang') ? 'bg-[#004aad]' : 'text-gray-600 hover:text-[#004aad] hover:bg-blue-50'}>
                <Warehouse className="w-4 h-4 mr-2" /> Gudang
              </Button>
            </Link>

            <Link href="/units">
              <Button variant={isActive('/units') ? 'default' : 'ghost'} className={isActive('/units') ? 'bg-[#004aad]' : 'text-gray-600 hover:text-[#004aad] hover:bg-blue-50'}>
                <Scale className="w-4 h-4 mr-2" /> Satuan
              </Button>
            </Link>

            <Link href="/users">
              <Button variant={isActive('/users') ? 'default' : 'ghost'} className={isActive('/users') ? 'bg-[#004aad]' : 'text-gray-600 hover:text-[#004aad] hover:bg-blue-50'}>
                <Users className="w-4 h-4 mr-2" /> Pengguna
              </Button>
            </Link>

             <Link href="/analytics">
              <Button variant={isActive('/analytics') ? 'default' : 'ghost'} className={isActive('/analytics') ? 'bg-[#004aad]' : 'text-gray-600 hover:text-[#004aad] hover:bg-blue-50'}>
                <ChartPie className="w-4 h-4 mr-2" /> Analytics
              </Button>
            </Link>
          </div>

          {/* --- MENU BARU: LAPORAN Opname --- */}
            <Link href="/laporan">
              <Button variant={isActive('/laporan') ? 'default' : 'ghost'} className={isActive('/laporan') ? 'bg-[#004aad]' : 'text-gray-600 hover:text-[#004aad] hover:bg-blue-50'}>
                <ClipboardList className="w-4 h-4 mr-2" /> Stok Opname
              </Button>
            </Link>
            {/* ------------------------- */}

            {/* --- MENU BARU: Riwayat Opname --- */}
            <Link href="/laporan/riwayat">
              <Button variant={isActive('/laporan') ? 'default' : 'ghost'} className={isActive('/laporan') ? 'bg-[#004aad]' : 'text-gray-600 hover:text-[#004aad] hover:bg-blue-50'}>
                <ClipboardList className="w-4 h-4 mr-2" /> Riwayat Stok Opname
              </Button>
            </Link>
            {/* ------------------------- */}

            <Link href="/history"></Link>

          {/* User Info & Logout */}
          <div className="flex items-center gap-4">
             <span className="text-sm font-medium text-gray-500 hidden md:block">
                Halo, {session.user?.name}
             </span>
             <Button 
                variant="outline" 
                size="sm" 
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50"
             >
                <LogOut className="w-4 h-4 mr-2" /> Keluar
              </Button>
          </div>

        </div>
      </div>
    </nav>
  );
}