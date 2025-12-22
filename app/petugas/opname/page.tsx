'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import Navbar from '../../../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Loader2, Save, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function OpnameCalculatorPage() {
  const { data: session } = useSession();
  const { data: productsData, isLoading } = useSWR('/api/products', fetcher);
  
  const [selectedProductId, setSelectedProductId] = useState("");
  const [stokFisik, setStokFisik] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  const products = productsData?.data || [];

  const selectedProduct = useMemo(() => products.find((p: any) => p.id === selectedProductId), [products, selectedProductId]);
  const stokSistem = selectedProduct ? parseInt(selectedProduct.stock) : 0;
  const fisikNum = stokFisik === "" ? 0 : parseInt(stokFisik);
  const selisih = selectedProduct && stokFisik !== "" ? (fisikNum - stokSistem) : 0;

  const handleSave = async () => {
    if (!selectedProduct || stokFisik === "") return;
    setIsSubmitting(true);
    setStatusMsg(null);

    try {
        const res = await fetch('/api/petugas/opname', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                kode_qr: selectedProduct.qr_code,
                nama_produk: selectedProduct.name,
                stok_sistem: stokSistem,
                stok_fisik: fisikNum,
                petugas: session?.user?.name || "Petugas Lapangan"
            })
        });

        if (res.ok) {
            setStatusMsg({ type: 'success', text: 'Tersimpan (Menunggu Approval)' });
            setTimeout(() => {
                setStatusMsg(null);
                setStokFisik("");
                setSelectedProductId("");
            }, 1500);
        } else {
            setStatusMsg({ type: 'error', text: 'Gagal menyimpan' });
        }
    } catch (e) {
        setStatusMsg({ type: 'error', text: 'Koneksi error' });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex justify-center items-center bg-gray-50 text-gray-500">Memuat produk...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      <Navbar />
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
            <Link href="/petugas">
                <Button variant="ghost" size="icon"><ArrowLeft className="w-6 h-6 text-gray-700"/></Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-800">Input Stock Opname</h1>
        </div>

        {statusMsg && (
            <div className={`p-4 rounded-lg flex items-center gap-3 shadow-sm ${statusMsg.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                <span className="font-medium">{statusMsg.text}</span>
            </div>
        )}

        <Card className="shadow-md border-0 rounded-xl overflow-hidden">
            <div className="h-2 bg-[#004aad] w-full"></div>
            <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                    <Label>Pilih Barang / SKU</Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger className="h-12 bg-gray-50"><SelectValue placeholder="Cari barang..." /></SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                            {products.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase font-bold text-center block">Sistem</Label>
                        <div className="h-14 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                            <span className="text-xl font-bold text-gray-600">{selectedProductId ? stokSistem : "-"}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-[#004aad] uppercase font-bold text-center block">Fisik (Real)</Label>
                        <Input type="number" placeholder="0" className="h-14 text-center text-2xl font-bold border-2 border-[#004aad] text-[#004aad]"
                            value={stokFisik} onChange={(e) => setStokFisik(e.target.value)} disabled={!selectedProductId}
                        />
                    </div>
                </div>

                {selectedProductId && stokFisik !== "" && (
                    <div className={`p-4 rounded-xl border flex justify-between items-center ${selisih === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        <span className="text-xs font-bold uppercase">Selisih</span>
                        <span className="text-2xl font-black">{selisih > 0 ? "+" : ""}{selisih}</span>
                    </div>
                )}

                <Button className="w-full h-14 text-lg font-bold bg-[#004aad] hover:bg-blue-800" disabled={!selectedProductId || stokFisik === "" || isSubmitting} onClick={handleSave}>
                    {isSubmitting ? <Loader2 className="w-6 h-6 mr-2 animate-spin"/> : <Save className="w-6 h-6 mr-2"/>} Simpan
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}