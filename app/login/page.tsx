'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from "../../components/ui/button";
import { Input } from "../..//components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Lock, User } from "lucide-react";

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
      // Redirect manual sebagai fallback, middleware akan menangani sisanya
      window.location.href = '/'; 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-[#004aad]">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-[#004aad] rounded-xl flex items-center justify-center mb-2">
             <span className="text-white font-bold text-2xl">M</span>
          </div>
          <CardTitle className="text-2xl font-bold text-[#004aad]">Mirota KSM</CardTitle>
          <CardDescription>Login Sistem Gudang Terpadu</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Username" 
                  className="pl-10"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  type="password" 
                  placeholder="Password" 
                  className="pl-10" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
            </div>
            
            {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

            <Button type="submit" className="w-full bg-[#004aad] hover:bg-blue-800" disabled={isLoading}>
              {isLoading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}