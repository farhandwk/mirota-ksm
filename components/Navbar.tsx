'use client';

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from "../components/ui/button";
import { 
  Package, History, LogOut, ChartPie, Building2, Scale, Users, 
  ClipboardList, Warehouse, Menu, X, ChevronRight, ChevronLeft 
} from "lucide-react";
import mirota from "../src/logo.png"; // Pastikan path ini benar
import Image from "next/image";
import { cn } from "../lib/utils"; // Jika tidak punya utility cn, bisa pakai string template biasa

// Definisi Menu Item supaya kodingan rapi
const menuItems = [
  { href: '/inventory', label: 'Stok', icon: Package },
  { href: '/history', label: 'Riwayat', icon: History },
  { href: '/gudang', label: 'Gudang', icon: Warehouse },
  { href: '/units', label: 'Satuan', icon: Scale },
  { href: '/users', label: 'Pengguna', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: ChartPie },
  { href: '/laporan', label: 'Stok Opname', icon: ClipboardList },
  { href: '/laporan/riwayat', label: 'Riwayat Opname', icon: ClipboardList },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // State untuk Mobile Toggle
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // State untuk Desktop Hover
  const [isHovered, setIsHovered] = useState(false);

  // 1. Cek Role (Sama seperti logika lama)
  const userRole = session?.user?.role;
  if (!session || userRole === 'Manajerial' || userRole === 'Petugas') {
    return null;
  }

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* --- TOMBOL MOBILE (Hanya muncul di layar kecil) --- */}
      <div className="md:hidden fixed top-0 left-0 z-50 p-4 w-full bg-white border-b flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
            <Menu className="w-6 h-6 text-[#004aad]" />
            </Button>
            <span className="font-bold text-[#004aad]">Mirota KSM</span>
        </div>
      </div>

      {/* --- OVERLAY MOBILE (Gelapkan background saat menu terbuka) --- */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* --- SIDEBAR CONTAINER --- */}
     <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed top-0 left-0 z-50 h-screen bg-white border-r border-gray-200 shadow-xl 
          flex flex-col
          
          ${/* 1. KUNCI TRANSISI: Gunakan transition-all atau transition-transform */ ""}
          transition-all duration-300 ease-in-out

          ${/* 2. LOGIKA POSISI (MOBILE) */ ""}
          ${/* Hapus 'hidden'. Gunakan translate untuk menyembunyikan */ ""}
          ${isMobileOpen 
             ? "translate-x-0"          // Buka: Geser ke posisi 0 (Masuk Layar)
             : "-translate-x-full"      // Tutup: Geser ke -100% (Keluar Layar Kiri)
          }

          ${/* 3. LOGIKA DESKTOP */ ""}
          ${/* Di desktop (md), paksa reset posisi ke 0 agar selalu muncul */ ""}
          md:translate-x-0 

          ${/* 4. LOGIKA LEBAR (WIDTH) */ ""}
          ${isMobileOpen ? "w-64" : (isHovered ? "w-64" : "w-20")}
        `}
      >
        {/* 1. Header Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-100 relative">
          {/* Tampilkan Logo Penuh jika Hovered / Mobile Open */}
          <div className={`transition-opacity duration-300 ${isHovered || isMobileOpen ? "opacity-100 px-4" : "opacity-0 absolute"}`}>
            <Image src={mirota} alt="Mirota" width={120} height={40} className="object-contain" />
          </div>
          
          {/* Tampilkan Icon Kecil jika Collapsed (Desktop only) */}
          <div className={`transition-opacity duration-300 absolute ${!isHovered && !isMobileOpen ? "opacity-100" : "opacity-0"}`}>
             {/* Gunakan huruf M atau icon logo kecil disini jika ada, sementara saya pakai text inisial */}
             <span className="text-[#004aad] font-bold text-xl">M</span>
          </div>

          {/* Tombol Close di Mobile */}
          <button 
            onClick={() => setIsMobileOpen(false)} 
            className="md:hidden absolute right-4 text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 2. Menu Items (Scrollable area) */}
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 px-3">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
                <div
                  className={`
                    flex items-center p-3 rounded-lg transition-all duration-200 cursor-pointer
                    ${active 
                      ? "bg-[#004aad] text-white shadow-md" 
                      : "text-gray-600 hover:bg-blue-50 hover:text-[#004aad]"
                    }
                  `}
                >
                  {/* Icon selalu muncul */}
                  <item.icon className={`w-6 h-6 min-w-[24px] ${active ? "text-white" : ""}`} />
                  
                  {/* Label hanya muncul saat Hover / Mobile Open */}
                  <span 
                    className={`
                      ml-4 font-medium whitespace-nowrap overflow-hidden transition-all duration-300
                      ${isHovered || isMobileOpen ? "w-auto opacity-100" : "w-0 opacity-0 md:w-0"}
                    `}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 3. Footer (User & Logout) */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center overflow-hidden">
             {/* Avatar / Icon User */}
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center min-w-[40px] text-[#004aad] font-bold">
              {session.user?.name?.charAt(0) || "U"}
            </div>

            {/* User Info (Show on Hover) */}
            <div className={`ml-3 flex flex-col transition-all duration-300 overflow-hidden ${isHovered || isMobileOpen ? "w-auto opacity-100" : "w-0 opacity-0"}`}>
              <span className="text-sm font-semibold text-gray-700 truncate">{session.user?.name}</span>
              <span className="text-xs text-gray-500 truncate">{session.user?.role}</span>
            </div>
            
            {/* Tombol Logout (Selalu Icon, Expand saat hover) */}
            <div className={`ml-auto transition-all duration-300 ${isHovered || isMobileOpen ? "opacity-100" : "opacity-0 hidden"}`}>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="text-red-500 hover:bg-red-50"
                    title="Keluar"
                >
                    <LogOut className="w-5 h-5" />
                </Button>
            </div>
          </div>
          
          {/* Tombol Logout Versi Collapsed (Hanya muncul icon di bawah avatar jika collapsed) */}
           <div className={`mt-2 flex justify-center ${!isHovered && !isMobileOpen ? "block" : "hidden"}`}>
              <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="text-red-500 hover:bg-red-50"
                    title="Keluar"
                >
                    <LogOut className="w-5 h-5" />
              </Button>
           </div>
        </div>

      </aside>
    </>
  );
}