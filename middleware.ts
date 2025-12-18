import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token: any = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // 1. Cek Login: Jika belum login, tendang ke /login
  if (!token) {
    if (pathname !== '/login') {
        return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  const role = token.role; // "Kepala Gudang", "Manajerial", "Petugas"

  // 2. Aturan Akses Berdasarkan Role

  // --- ROLE: PETUGASA ---
  // Hanya boleh akses halaman yang berawalan /petugas
  if (role === 'Petugas') {
    if (!pathname.startsWith('/petugas')) {
      return NextResponse.redirect(new URL('/petugas', req.url));
    }
  }

  // --- ROLE: MANAJERIAL ---
  // Hanya boleh akses halaman yang berawalan /analytics
  if (role === 'Manajerial') {
    if (!pathname.startsWith('/analytics')) {
      return NextResponse.redirect(new URL('/analytics', req.url));
    }
  }

  // --- ROLE: KEPALA GUDANG ---
  // Bebas akses kemana saja, KECUALI jika dia buka halaman login lagi, arahkan ke dashboard
  if (pathname === '/login') {
     if (role === 'Kepala Gudang') return NextResponse.redirect(new URL('/inventory', req.url));
     if (role === 'Petugas') return NextResponse.redirect(new URL('/petugas', req.url));
     if (role === 'Manajerial') return NextResponse.redirect(new URL('/analytics', req.url));
  }

  return NextResponse.next();
}

// Halaman mana saja yang dijaga middleware
export const config = {
  matcher: [
    '/', 
    '/login',
    '/inventory/:path*', 
    '/history/:path*', 
    '/analytics/:path*', 
    '/departments/:path*', 
    '/units/:path*', 
    '/petugas/:path*',
    '/laporan/:path',
    '/gudang/:path'
  ],
};