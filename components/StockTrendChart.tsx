'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
  // Legend bawaan dihapus karena kita pakai custom legend di bawah
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { 
  format, addHours, addDays, addMonths, startOfDay, endOfDay, 
  startOfMonth, endOfMonth, isAfter, setHours
} from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar, Clock, Eye, EyeOff, CheckSquare, Square, Filter } from "lucide-react"; 
import { Button } from "./ui/button";
import { Input } from "./ui/input";

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
  
  // State Waktu (SAMA PERSIS SEPERTI KODE ANDA)
  const [viewMode, setViewMode] = useState<ViewMode>('DAILY');
  
  const [detailDate, setDetailDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startHour, setStartHour] = useState<string>("08");
  const [endHour, setEndHour] = useState<string>("17");

  const [dailyStart, setDailyStart] = useState<string>(""); 
  const [dailyEnd, setDailyEnd] = useState<string>("");

  const [monthStart, setMonthStart] = useState<string>(""); 
  const [monthEnd, setMonthEnd] = useState<string>("");

  // Logic Dept & Product
  const uniqueDepts = useMemo(() => {
    if (departments && departments.length > 0) return departments;
    const depts = new Set(products.map(p => p.department_id));
    return Array.from(depts).map(d => ({ id: d, nama: d }));
  }, [products, departments]);

  const availableProducts = useMemo(() => {
    let filtered = products;
    if (selectedDept !== "ALL") {
        filtered = products.filter(p => p.department_id === selectedDept);
    }
    // Urutkan berdasarkan stok terbanyak agar yang muncul di atas adalah yang terpenting
    return filtered.sort((a, b) => b.stock - a.stock);
  }, [selectedDept, products]);

  // Default Selection: Top 5 products saat load awal
  useEffect(() => {
    if (products.length > 0 && selectedProductIds.length === 0) {
        // Ambil 5 teratas saja agar chart tidak meledak di awal
        setSelectedProductIds(availableProducts.slice(0, 5).map(p => p.id));
    }
  }, [products, availableProducts]); 

  // Handlers
  const handleDeptChange = (val: string) => {
      setSelectedDept(val);
      // Saat ganti dept, reset ke top 5 dept tersebut
      const newProducts = val === "ALL" ? products : products.filter(p => p.department_id === val);
      const sorted = newProducts.sort((a,b) => b.stock - a.stock);
      setSelectedProductIds(sorted.slice(0, 5).map(p => p.id));
  };

  const toggleProduct = (pid: string) => setSelectedProductIds(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]);
  const selectAll = () => setSelectedProductIds(availableProducts.map(p => p.id));
  const clearAll = () => setSelectedProductIds([]);

  // --- ENGINE UTAMA (LOGIC TIMESTAMP ANDA) ---
  const chartData = useMemo(() => {
    if (selectedProductIds.length === 0) return [];

    const selectedProds = products.filter(p => selectedProductIds.includes(p.id));
    const relevantQrCodes = selectedProds.map(p => p.qr_code);
    const relevantTrx = transactions.filter(t => relevantQrCodes.includes(t.qr_code));
    
    // --- HELPER FIX TIMEZONE ---
    // Fungsi ini membuang 'Z' agar browser membaca string sebagai Waktu Lokal, bukan UTC
    const getLocalTs = (dateStr: string) => {
        if (!dateStr) return 0;
        return new Date(dateStr.replace('Z', '')).getTime();
    };

    // 1. Timeline Histori (Gunakan getLocalTs saat sorting)
    relevantTrx.sort((a, b) => getLocalTs(b.date) - getLocalTs(a.date));

    let currentBalances: Record<string, number> = {};
    selectedProds.forEach(p => { currentBalances[p.qr_code] = Number(p.stock); });

    let historyPoints = [];
    historyPoints.push({ ts: new Date().getTime(), balances: { ...currentBalances } });

    relevantTrx.forEach((tx) => {
        // GUNAKAN getLocalTs DI SINI JUGA
        historyPoints.push({ ts: getLocalTs(tx.date), balances: { ...currentBalances } });
        
        const qty = Number(tx.qty);
        // Reverse logic: Kita mundur ke masa lalu, jadi:
        // Jika transaksi IN (Barang Masuk), stok sebelumnya berarti LEBIH SEDIKIT (-)
        // Jika transaksi OUT (Barang Keluar), stok sebelumnya berarti LEBIH BANYAK (+)
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

        // Logic tambahan untuk mode DAILY/MONTHLY agar mengambil nilai AKHIR periode (Closing Stock)
        if (viewMode !== 'DETAIL') {
             const endTickTs = (viewMode === 'DAILY' ? endOfDay(tickDate) : endOfMonth(tickDate)).getTime();
             for (let i = 0; i < historyPoints.length; i++) {
                if (historyPoints[i].ts <= endTickTs) {
                    snapshotBalances = historyPoints[i].balances;
                } else { break; }
            }
        }

        return {
            dateObj: tickDate,
            displayDate: format(tickDate, formatLabel, { locale: id }),
            timestamp: tickTs,
            ...snapshotBalances
        };
    });

    const endOfToday = endOfDay(new Date());
    finalData = finalData.filter(item => {
        return !isAfter(startOfDay(item.dateObj), endOfToday);
    });

    return finalData;

  }, [selectedProductIds, products, transactions, viewMode, detailDate, startHour, endHour, dailyStart, dailyEnd, monthStart, monthEnd]);


  return (
    <Card className="col-span-1 md:col-span-2 shadow-sm border-t-4 border-t-[#004aad]">
      <CardHeader>
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
                        Analisis pergerakan stok berdasarkan interval waktu.
                    </CardDescription>
                </div>

                {/* --- BAGIAN FILTER TIME (KODE ASLI ANDA) --- */}
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
            
            {/* Filter Departemen (Pindah ke sini agar Header lebih bersih) */}
            <div className="w-full md:w-1/3">
                <Label className="text-xs text-gray-500 uppercase mb-1 block">Filter Departemen</Label>
                <Select value={selectedDept} onValueChange={handleDeptChange}>
                    <SelectTrigger className="bg-white h-9"><SelectValue placeholder="Pilih Dept" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Semua Departemen</SelectItem>
                        {uniqueDepts.map((d: any) => (<SelectItem key={d.id} value={d.id}>{d.nama}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* AREA CHART */}
        <div className="h-[350px] w-full mb-6">
            {selectedProductIds.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="displayDate" fontSize={11} tickMargin={10} minTickGap={30} stroke="#9ca3af" />
                    <YAxis fontSize={11} domain={['auto', 'auto']} stroke="#9ca3af" />
                    <Tooltip contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    {/* LEGEND BAWAAN RECHARTS DIHAPUS - DIGANTI CUSTOM DI BAWAH */}
                    
                    {selectedProductIds.map((prodId, index) => {
                        const prod = products.find(p => p.id === prodId);
                        if (!prod) return null;
                        return (
                            <Line 
                                key={prod.id} 
                                type="monotone" 
                                dataKey={prod.qr_code} 
                                name={prod.name} 
                                stroke={LINE_COLORS[index % LINE_COLORS.length]} 
                                strokeWidth={2} 
                                dot={viewMode === 'MONTHLY'} 
                                activeDot={{ r: 6 }} 
                                animationDuration={800}
                            />
                        );
                    })}
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded-lg bg-gray-50/50">
                    <Filter className="w-8 h-8 mb-2 opacity-50"/>
                    <p>Pilih produk di bawah untuk melihat grafik.</p>
                </div>
            )}
        </div>

        {/* AREA CUSTOM LEGEND & SELECTION (PENGGANTI BADGE HEADER) */}
        <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-gray-700">
                    Pilih Produk ({selectedProductIds.length}/{availableProducts.length})
                </h4>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        <CheckSquare className="w-3 h-3 mr-1"/> Pilih Semua
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Square className="w-3 h-3 mr-1"/> Hapus Semua
                    </Button>
                </div>
            </div>

            {/* SCROLLABLE GRID UNTUK BANYAK PRODUK */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                {availableProducts.length === 0 ? (
                    <span className="text-xs text-gray-400 italic col-span-full text-center py-4">Tidak ada produk di departemen ini.</span>
                ) : (
                    availableProducts.map((prod, index) => {
                        const isSelected = selectedProductIds.includes(prod.id);
                        // Gunakan logika warna yang sama dengan chart (modulo index produk di dalam array available)
                        // Kita cari index original produk ini di dalam selection logic chart jika memungkinkan, 
                        // tapi untuk konsistensi warna yang sederhana, kita pakai index dari map ini
                        const colorIndex = selectedProductIds.indexOf(prod.id);
                        const color = colorIndex >= 0 ? LINE_COLORS[colorIndex % LINE_COLORS.length] : '#9ca3af';

                        return (
                            <button
                                key={prod.id}
                                onClick={() => toggleProduct(prod.id)}
                                className={`
                                    flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all border text-left
                                    ${isSelected 
                                        ? 'bg-white border-gray-200 shadow-sm opacity-100 ring-1 ring-transparent hover:ring-gray-300' 
                                        : 'bg-gray-50 border-transparent opacity-50 hover:opacity-80 grayscale'
                                    }
                                `}
                            >
                                {/* Dot Warna */}
                                <div 
                                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors`}
                                    style={{ backgroundColor: isSelected ? color : '#d1d5db' }} 
                                />
                                
                                <span className="truncate font-medium flex-1 text-gray-700">
                                    {prod.name}
                                </span>

                                {isSelected ? <Eye className="w-3 h-3 text-gray-400"/> : <EyeOff className="w-3 h-3 text-gray-300"/>}
                            </button>
                        )
                    })
                )}
            </div>
        </div>

      </CardContent>
    </Card>
  );
}