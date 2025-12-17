'use client';

import { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { subHours, subDays, subMonths, format, isAfter, startOfHour, startOfDay, isSameHour, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';

// Tipe Data
type TimeRange = '24h' | '3d' | '7d' | '30d' | '3m' | '6m';
type FilterMode = 'ALL' | 'DEPT' | 'PRODUCT';

interface StockTrendChartProps {
  products: any[];
  transactions: any[];
}

export default function StockTrendChart({ products, transactions }: StockTrendChartProps) {
  // --- STATE ---
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL');
  const [selectedId, setSelectedId] = useState<string>('all');

  // --- LOGIC UTAMA (FORWARD CALCULATION) ---
  const chartData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    // 1. Filter Data Berdasarkan Entitas (Dept/Produk)
    let filteredTx = transactions;
    
    if (filterMode === 'DEPT' && selectedId !== 'all') {
      filteredTx = transactions.filter(t => t.dept_id === selectedId);
    } else if (filterMode === 'PRODUCT' && selectedId !== 'all') {
      // Cari kode QR produk tersebut dulu
      const targetProduct = products.find(p => p.id === selectedId);
      if (targetProduct) {
        filteredTx = transactions.filter(t => t.qr_code === targetProduct.qr_code);
      } else {
        filteredTx = [];
      }
    }

    // 2. Urutkan Transaksi dari LAMA ke BARU (Ascending)
    // Penting agar akumulasi berjalan urut waktu
    filteredTx.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 3. Tentukan Rentang Waktu View (Batas Kiri Grafik)
    const now = new Date();
    let startDate = subDays(now, 7); // Default
    let dateFormat = 'dd MMM'; 

    if (timeRange === '24h') { startDate = subHours(now, 24); dateFormat = 'HH:mm'; }
    if (timeRange === '3d') { startDate = subDays(now, 3); dateFormat = 'dd MMM HH:mm'; }
    if (timeRange === '7d') { startDate = subDays(now, 7); dateFormat = 'dd MMM'; }
    if (timeRange === '30d') { startDate = subDays(now, 30); dateFormat = 'dd MMM'; }
    if (timeRange === '3m') { startDate = subMonths(now, 3); dateFormat = 'dd MMM'; }
    if (timeRange === '6m') { startDate = subMonths(now, 6); dateFormat = 'MMM yyyy'; }

    // 4. Hitung Running Balance (Saldo Berjalan)
    // Kita hitung dari transaksi PERTAMA dalam sejarah, agar saat masuk ke 'startDate', angkanya sudah benar.
    let currentBalance = 0;
    const dataPoints: any[] = [];

    // Proses Akumulasi
    filteredTx.forEach(tx => {
      const txDate = new Date(tx.date);
      const qty = Number(tx.qty);

      // Update Saldo
      if (tx.type === 'IN') {
        currentBalance += qty;
      } else if (tx.type === 'OUT') {
        currentBalance -= qty;
      }

      // Hanya masukkan ke Data Grafik jika tanggalnya masuk dalam TimeRange yang dipilih
      if (isAfter(txDate, startDate)) {
        // Logika Bucketing (Pengelompokan) agar grafik tidak terlalu rapat
        // Jika mode 24 Jam -> Kelompokkan per Jam
        // Jika mode Hari/Bulan -> Kelompokkan per Hari
        
        const pointLabel = format(txDate, dateFormat, { locale: id });
        
        // Cek apakah sudah ada titik data di jam/hari yang sama?
        // Jika ya, update stok terakhirnya. Jika tidak, buat titik baru.
        const lastPoint = dataPoints[dataPoints.length - 1];
        
        let shouldMerge = false;
        if (lastPoint) {
            if (timeRange === '24h') {
                shouldMerge = isSameHour(txDate, lastPoint.rawDate);
            } else {
                shouldMerge = isSameDay(txDate, lastPoint.rawDate);
            }
        }

        if (shouldMerge) {
            // Update titik terakhir dengan saldo terbaru hari itu
            lastPoint.stock = currentBalance; 
        } else {
            // Buat titik baru
            dataPoints.push({
                rawDate: txDate, // Disimpan untuk validasi bucketing
                label: pointLabel,
                stock: currentBalance
            });
        }
      }
    });

    // Jika data kosong dalam rentang waktu tersebut (tapi ada saldo sebelumnya)
    // Tambahkan titik awal agar grafik tidak kosong melompong
    if (dataPoints.length === 0 && currentBalance > 0) {
        dataPoints.push({
            label: 'Awal Periode',
            stock: currentBalance
        });
        dataPoints.push({
            label: 'Sekarang',
            stock: currentBalance
        });
    }

    return dataPoints;

  }, [transactions, products, timeRange, filterMode, selectedId]);


  // --- Helper Opsi Dropdown ---
  const getSubOptions = () => {
    if (filterMode === 'DEPT') {
      const depts = Array.from(new Set(products.map(p => p.department_id))).filter(Boolean);
      return depts.map(d => ({ label: `Dept ${d}`, value: d }));
    }
    if (filterMode === 'PRODUCT') {
      return products.map(p => ({ label: p.name, value: p.id }));
    }
    return [];
  };

  return (
    <Card className="shadow-sm border-t-4 border-t-[#004aad]">
      <CardHeader>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <CardTitle>Analisis Level Stok</CardTitle>
            <CardDescription>
              Pergerakan stok berdasarkan riwayat transaksi {timeRange === '24h' ? '(Realtime)' : '(Harian)'}
            </CardDescription>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            {/* Filter Mode */}
            <Select value={filterMode} onValueChange={(val: any) => { setFilterMode(val); setSelectedId('all'); }}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Total Gudang</SelectItem>
                <SelectItem value="DEPT">Per Departemen</SelectItem>
                <SelectItem value="PRODUCT">Per Produk</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Item Spesifik */}
            {filterMode !== 'ALL' && (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Pilih Item..." />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="all">-- Semua --</SelectItem>
                   {getSubOptions().map((opt: any) => (
                     <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                   ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        
        {/* TAB WAKTU */}
        <div className="mt-4 overflow-x-auto pb-2">
          <Tabs defaultValue="7d" value={timeRange} onValueChange={(val: any) => setTimeRange(val)}>
            <TabsList className="w-full justify-start md:justify-center">
              <TabsTrigger value="24h">24 Jam</TabsTrigger>
              <TabsTrigger value="3d">3 Hari</TabsTrigger>
              <TabsTrigger value="7d">1 Minggu</TabsTrigger>
              <TabsTrigger value="30d">1 Bulan</TabsTrigger>
              <TabsTrigger value="3m">3 Bulan</TabsTrigger>
              <TabsTrigger value="6m">6 Bulan</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="h-[400px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#004aad" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#004aad" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="label" 
              fontSize={12} 
              minTickGap={30}
              tickMargin={10}
            />
            <YAxis fontSize={12} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
              formatter={(value: number | undefined) => [`${value ?? 0}`, 'Stok Level']}
              labelStyle={{ color: '#004aad', fontWeight: 'bold' }}
            />
            <Area 
              type="monotone" 
              dataKey="stock" 
              stroke="#004aad" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorStock)" 
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {chartData.length === 0 && (
            <div className="text-center text-sm text-gray-400 mt-[-200px]">
                Belum ada data transaksi pada periode ini.
            </div>
        )}
      </CardContent>
    </Card>
  );
}