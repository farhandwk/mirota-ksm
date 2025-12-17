import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// Import Providers dari komponen buatan kita, BUKAN dari next-auth langsung
import { Providers } from "../components/Providers"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mirota KSM Warehouse",
  description: "Sistem Manajemen Gudang",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        {/* Bungkus aplikasi dengan Providers buatan kita */}
        <Providers>
           {children}
        </Providers>
      </body>
    </html>
  );
}