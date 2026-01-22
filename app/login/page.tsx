'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Image from "next/image"
import { useRouter } from 'next/navigation';
import { Button } from "../../components/ui/button";
import { Input } from "../..//components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Lock, User } from "lucide-react";
import mirota from "../../src/logo.png"

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      username: formData.username,
      password: formData.password,
    });

    if (res?.error) {
      setError('Username atau Password salah!');
      setIsLoading(false);
    } else {
      router.refresh(); 
      window.location.href = '/'; 
    }
  };

  return (
    // 1. BACKGROUND LEBIH KUAT (from-[#004aad] tanpa opasitas di awal)
    <div className="min-h-screen h-full flex items-center justify-center p-4 bg-gradient-to-br from-[#004aad] via-[#004aad]/30 to-white">
      
      {/* 2. GLASS EFFECT LEBIH TERASA 
          - bg-white/70: Transparansi background kartu dikurangi agar warna biru di belakang tembus.
          - backdrop-blur-md: Efek buram yang lebih kuat.
          - border-white/50: Garis tepi putih transparan (seperti tebal kaca).
      */}
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-[#004aad] border-x border-b border-white/50 py-12 animate-in fade-in zoom-in-95 slide-in-from-bottom-10 duration-700 ease-out bg-white/70 backdrop-blur-md relative overflow-hidden">
        
        {/* Hiasan Kilau Kaca (Optional: Efek cahaya di pojok) */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        <CardHeader className="text-center space-y-2 relative z-10">
          <div className="mx-auto w-36 h-auto bg-none rounded-xl flex items-center justify-center mb-2">
             {/* Drop shadow pada logo agar kontras dengan kaca */}
             <Image 
             src={mirota}
             alt ="Logo Mirota KSM"
             priority 
             className="drop-shadow-sm" 
             />
          </div>
          <CardDescription className="text-gray-700 font-medium">Login Sistem Gudang Terpadu</CardDescription>
        </CardHeader>
        
        <CardContent className="relative z-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <div className="relative group">
                <User className="absolute left-3 top-3 h-4 w-4 text-[#004aad] group-hover:scale-110 transition-transform duration-200" />
                <Input 
                  placeholder="Username" 
                  // Input dibuat sedikit transparan juga agar menyatu
                  className="pl-10 focus-visible:ring-[#004aad] border-gray-300 bg-white/50 focus:bg-white transition-all" 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative group">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[#004aad] group-hover:scale-110 transition-transform duration-200" />
                <Input 
                  type="password" 
                  placeholder="Password" 
                  className="pl-10 focus-visible:ring-[#004aad] border-gray-300 bg-white/50 focus:bg-white transition-all" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
            </div>
            
            {error && (
              <p className="text-red-600 bg-red-50/80 p-2 rounded-md text-sm text-center font-bold animate-in slide-in-from-top-2 fade-in duration-300 border border-red-100">
                {error}
              </p>
            )}

            <Button 
                type="submit" 
                className="w-full bg-[#004aad] hover:bg-blue-900 text-white font-bold tracking-wide shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 transition-all duration-300 active:scale-95 h-11" 
                disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Memproses...
                </span>
              ) : 'MASUK'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}