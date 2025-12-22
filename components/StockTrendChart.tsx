'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { 
  format, addHours, addDays, addMonths, startOfDay, endOfDay, 
  startOfMonth, endOfMonth, isBefore, isAfter, setHours, isFuture 
} from 'date-fns';
import { id } from 'date-fns/locale';
import { Check, CheckSquare, Square, Calendar, Clock } from "lucide-react"; 
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

interface Product {
  id: string;
  qr_code: string;
  name: string;
  stock: number;
  department_id: string;
}

interface Transaction {
  date: string;
  type: 'IN' | 'OUT';
  qty: number | string;
  qr_code: string;
}

interface Props {
  products: Product[];
  transactions: Transaction[];
  departments?: any[]; 
}

const LINE_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706", "#9333ea", "#db2777", "#0891b2",
  "#6366f1", "#84cc16", "#f59e0b", "#ec4899", "#14b8a6", "#64748b"
];

type ViewMode = 'DETAIL' | 'DAILY' | 'MONTHLY';

export default function StockTrendChart({ products, transactions, departments }: Props) {
  // --- STATE ---
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // State Waktu
  const [viewMode, setViewMode] = useState<ViewMode>('DAILY');
  
  const [detailDate, setDetailDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startHour, setStartHour] = useState<string>("08");
  const [endHour, setEndHour] = useState<string>("17");

  const [dailyStart, setDailyStart] = useState<string>(""); 
  const [dailyEnd, setDailyEnd] = useState<string>("");

  const [monthStart, setMonthStart] = useState<string>(""); 
  const [monthEnd, setMonthEnd] = useState<string>("");

  // Logic Dept & Product (Sama)
  const uniqueDepts = useMemo(() => {
    if (departments && departments.length > 0) return departments;
    const depts = new Set(products.map(p => p.department_id));
    return Array.from(depts).map(d => ({ id: d, nama: d }));
  }, [products, departments]);

  const availableProducts = useMemo(() => {
    if (selectedDept === "ALL") return products;
    return products.filter(p => p.department_id === selectedDept);
  }, [selectedDept, products]);

  useEffect(() => {
    if (products.length > 0 && selectedProductIds.length === 0) {
        setSelectedProductIds(products.map(p => p.id));
    }
  }, [products]); 

  const handleDeptChange = (val: string) => {
      setSelectedDept(val);
      const newProducts = val === "ALL" ? products : products.filter(p => p.department_id === val);
      setSelectedProductIds(newProducts.map(p => p.id));
  };

  const toggleProduct = (pid: string) => setSelectedProductIds(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]);
  const selectAll = () => setSelectedProductIds(availableProducts.map(p => p.id));
  const clearAll = () => setSelectedProductIds([]);

  // --- ENGINE UTAMA ---
  const chartData = useMemo(() => {
    if (selectedProductIds.length === 0) return [];

    const selectedProds = products.filter(p => selectedProductIds.includes(p.id));
    const relevantQrCodes = selectedProds.map(p => p.qr_code);
    const relevantTrx = transactions.filter(t => relevantQrCodes.includes(t.qr_code));
    
    // 1. Timeline Histori
    relevantTrx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let currentBalances: Record<string, number> = {};
    selectedProds.forEach(p => { currentBalances[p.qr_code] = Number(p.stock); });

    let historyPoints = [];
    historyPoints.push({ ts: new Date().getTime(), balances: { ...currentBalances } });

    relevantTrx.forEach((tx) => {
        historyPoints.push({ ts: new Date(tx.date).getTime(), balances: { ...currentBalances } });
        const qty = Number(tx.qty);
        if (tx.type === 'IN') currentBalances[tx.qr_code] -= qty;
        else if (tx.type === 'OUT') currentBalances[tx.qr_code] += qty;
    });

    historyPoints.push({ ts: 0, balances: { ...currentBalances } });
    historyPoints = historyPoints.reverse();

    // 2. Generate Ticks
    let ticks: Date[] = [];
    let formatLabel = "";

    if (viewMode === 'DETAIL') {
        formatLabel = "HH:mm";
        const baseDate = detailDate ? new Date(detailDate) : new Date();
        const start = setHours(startOfDay(baseDate), parseInt(startHour));
        const end = setHours(startOfDay(baseDate), parseInt(endHour));
        let curr = start;
        while (curr <= end) { ticks.push(curr); curr = addHours(curr, 1); }
    } 
    else if (viewMode === 'DAILY') {
        formatLabel = "dd MMM";
        const end = dailyEnd ? endOfDay(new Date(dailyEnd)) : endOfDay(new Date());
        let start = dailyStart ? startOfDay(new Date(dailyStart)) : addDays(end, -7);
        let curr = start;
        while (curr <= end) { ticks.push(curr); curr = addDays(curr, 1); }
    } 
    else if (viewMode === 'MONTHLY') {
        formatLabel = "MMM yyyy";
        const end = monthEnd ? endOfMonth(new Date(monthEnd)) : endOfMonth(new Date());
        let start = monthStart ? startOfMonth(new Date(monthStart)) : addMonths(end, -6);
        let curr = start;
        while (curr <= end) { ticks.push(curr); curr = addMonths(curr, 1); }
    }

    // 3. Resampling
    let finalData = ticks.map((tickDate) => {
        const tickTs = tickDate.getTime();
        let snapshotBalances = historyPoints[0].balances;
        
        for (let i = 0; i < historyPoints.length; i++) {
            if (historyPoints[i].ts <= tickTs) {
                snapshotBalances = historyPoints[i].balances;
            } else { break; }
        }

        if (viewMode !== 'DETAIL') {
             const endTickTs = (viewMode === 'DAILY' ? endOfDay(tickDate) : endOfMonth(tickDate)).getTime();
             for (let i = 0; i < historyPoints.length; i++) {
                if (historyPoints[i].ts <= endTickTs) {
                    snapshotBalances = historyPoints[i].balances;
                } else { break; }
            }
        }

        return {
            dateObj: tickDate, // Simpan object date asli untuk filter
            displayDate: format(tickDate, formatLabel, { locale: id }),
            timestamp: tickTs,
            ...snapshotBalances
        };
    });

    // --- FIX: FILTER MASA DEPAN ---
    // Hapus titik data yang tanggalnya > Hari Ini (End of Today)
    const endOfToday = endOfDay(new Date());
    
    // Tapi hati-hati: Untuk 'MONTHLY', jika sekarang Des 2025, kita tetap ingin melihat titik Des 2025
    // meskipun 'tickDate' untuk bulan itu mungkin di-set ke awal/akhir bulan.
    // Jadi logikanya: Buang jika titik awal tick tersebut > hari ini.
    
    finalData = finalData.filter(item => {
        // Jika tick-nya dimulai besok atau bulan depan, hapus.
        // startOfDay digunakan agar perbandingan aman.
        return !isAfter(startOfDay(item.dateObj), endOfToday);
    });

    return finalData;

  }, [selectedProductIds, products, transactions, viewMode, detailDate, startHour, endHour, dailyStart, dailyEnd, monthStart, monthEnd]);


  return (
    <Card className="col-span-1 md:col-span-2 shadow-sm border border-gray-200">
      <CardHeader>
        {/* ... (HEADER & FILTER SAMA SEPERTI KODE SEBELUMNYA) ... */}
        {/* Tidak ada perubahan UI, hanya logic chartData di atas */}
        <div className="flex flex-col gap-6">
            <div className="flex flex-col xl:flex-row justify-between items-start gap-4">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        {viewMode === 'DETAIL' && <Clock className="w-5 h-5 text-blue-600"/>}
                        {viewMode === 'DAILY' && <Calendar className="w-5 h-5 text-green-600"/>}
                        {viewMode === 'MONTHLY' && <Calendar className="w-5 h-5 text-purple-600"/>}
                        Tren Stok {viewMode === 'DETAIL' ? 'Per Jam' : viewMode === 'DAILY' ? 'Harian' : 'Bulanan'}
                    </CardTitle>
                    <CardDescription>
                       Analisis posisi stok berdasarkan interval waktu tetap.
                    </CardDescription>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 bg-gray-50 p-2 rounded-lg border w-full xl:w-auto">
                    <div className="flex items-center gap-1 bg-white rounded-md border p-1">
                        <Button variant={viewMode === 'DETAIL' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('DETAIL')} className="h-7 px-2 text-xs">Jam</Button>
                        <Button variant={viewMode === 'DAILY' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('DAILY')} className="h-7 px-2 text-xs">Hari</Button>
                        <Button variant={viewMode === 'MONTHLY' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('MONTHLY')} className="h-7 px-2 text-xs">Bulan</Button>
                    </div>

                    <div className="h-4 w-[1px] bg-gray-300 mx-1 hidden sm:block"></div>

                    {viewMode === 'DETAIL' && (
                        <div className="flex gap-2 items-center flex-wrap">
                             <Input type="date" className="h-8 w-[130px] bg-white text-xs" 
                                value={detailDate} onChange={(e) => setDetailDate(e.target.value)} />
                             <Select value={startHour} onValueChange={setStartHour}>
                                <SelectTrigger className="h-8 w-[70px] bg-white text-xs"><SelectValue/></SelectTrigger>
                                <SelectContent>{Array.from({length:24},(_,i)=>i).map(h=><SelectItem key={h} value={h.toString().padStart(2,'0')}>{h.toString().padStart(2,'0')}:00</SelectItem>)}</SelectContent>
                             </Select>
                             <span className="text-gray-400">-</span>
                             <Select value={endHour} onValueChange={setEndHour}>
                                <SelectTrigger className="h-8 w-[70px] bg-white text-xs"><SelectValue/></SelectTrigger>
                                <SelectContent>{Array.from({length:24},(_,i)=>i).map(h=><SelectItem key={h} value={h.toString().padStart(2,'0')}>{h.toString().padStart(2,'0')}:00</SelectItem>)}</SelectContent>
                             </Select>
                        </div>
                    )}

                    {viewMode === 'DAILY' && (
                        <div className="flex gap-2 items-center">
                            <Input type="date" className="h-8 w-[130px] bg-white text-xs" 
                                value={dailyStart} onChange={(e) => setDailyStart(e.target.value)} placeholder="Start"/>
                            <span className="text-gray-400">-</span>
                            <Input type="date" className="h-8 w-[130px] bg-white text-xs" 
                                value={dailyEnd} onChange={(e) => setDailyEnd(e.target.value)} placeholder="End"/>
                        </div>
                    )}

                    {viewMode === 'MONTHLY' && (
                        <div className="flex gap-2 items-center">
                            <Input type="month" className="h-8 w-[140px] bg-white text-xs" 
                                value={monthStart} onChange={(e) => setMonthStart(e.target.value)} />
                            <span className="text-gray-400">-</span>
                            <Input type="month" className="h-8 w-[140px] bg-white text-xs" 
                                value={monthEnd} onChange={(e) => setMonthEnd(e.target.value)} />
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 bg-gray-50 p-3 rounded-md border">
                <div className="w-full md:w-1/3 space-y-1">
                    <Label className="text-xs text-gray-500 uppercase">Departemen</Label>
                    <Select value={selectedDept} onValueChange={handleDeptChange}>
                        <SelectTrigger className="bg-white h-9"><SelectValue placeholder="Pilih Dept" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua Departemen</SelectItem>
                            {uniqueDepts.map((d: any) => (<SelectItem key={d.id} value={d.id}>{d.nama}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full md:w-2/3 space-y-1">
                     <div className="flex justify-between items-center mb-2">
                        <Label className="text-xs text-gray-500 uppercase">Produk ({selectedProductIds.length})</Label>
                        <div className="flex gap-3 text-xs font-medium">
                            <button onClick={selectAll} className="text-blue-600 hover:text-blue-800 flex items-center gap-1"><CheckSquare className="w-3 h-3"/> All</button>
                            <button onClick={clearAll} className="text-red-500 hover:text-red-700 flex items-center gap-1"><Square className="w-3 h-3"/> Clear</button>
                        </div>
                     </div>
                     <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-white border rounded-md shadow-inner">
                        {availableProducts.length === 0 ? <span className="text-xs text-gray-400 italic">Tidak ada produk.</span> : 
                            availableProducts.map((prod) => {
                                const isSelected = selectedProductIds.includes(prod.id);
                                return (
                                    <Badge key={prod.id} variant={isSelected ? "default" : "outline"} className={`cursor-pointer select-none transition-all border ${isSelected ? "bg-[#004aad] text-white border-transparent" : "bg-gray-50 text-gray-600 border-gray-200"}`} onClick={() => toggleProduct(prod.id)}>
                                        {prod.name} {isSelected && <Check className="w-3 h-3 ml-1"/>}
                                    </Badge>
                                )
                            })
                        }
                     </div>
                </div>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="h-[450px]">
        {selectedProductIds.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="displayDate" fontSize={11} tickMargin={10} minTickGap={30} stroke="#9ca3af" />
              <YAxis fontSize={11} domain={['auto', 'auto']} stroke="#9ca3af" />
              <Tooltip contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle"/>
              {selectedProductIds.map((prodId, index) => {
                  const prod = products.find(p => p.id === prodId);
                  if (!prod) return null;
                  return (
                    <Line key={prod.id} type="monotone" dataKey={prod.qr_code} name={prod.name} stroke={LINE_COLORS[index % LINE_COLORS.length]} strokeWidth={2} dot={viewMode === 'MONTHLY'} activeDot={{ r: 6 }} />
                  );
              })}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded-lg bg-gray-50/50">
             <p>Tidak ada produk yang dipilih.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}