'use client';

import useSWR from 'swr';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "../../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { format } from 'date-fns'; // Opsional: untuk format tanggal yang rapi
import { id } from 'date-fns/locale'; // Opsional: format Indonesia
import Navbar from "../../components/Navbar"

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HistoryPage() {
  const { data, error } = useSWR('/api/transactions', fetcher);

  // Helper untuk format tanggal (bisa disesuaikan)
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy, HH:mm', { locale: id });
    } catch (e) {
      return dateString; // Fallback jika format gagal
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 md:p-10 font-sans">
        <Navbar/>
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#004aad]">Riwayat Transaksi</h1>
          <p className="text-muted-foreground">Log aktivitas keluar masuk barang di gudang.</p>
        </div>

        <Card className="shadow-sm border-t-4 border-t-[#004aad]">
          <CardHeader>
            <CardTitle>Jurnal Aktivitas</CardTitle>
            <CardDescription>Menampilkan semua transaksi terbaru.</CardDescription>
          </CardHeader>
          <CardContent>
            {!data ? (
              <div className="text-center py-10 text-gray-500">Memuat data log...</div>
            ) : error ? (
              <div className="text-center py-10 text-red-500">Gagal mengambil data.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Barang (QR)</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Oleh</TableHead>
                    <TableHead>Tujuan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs text-gray-500">
                        {formatDate(log.date)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={log.type === 'IN' ? 'default' : 'destructive'}
                          className={log.type === 'OUT' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                        >
                          {log.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.qr_code}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-base">
                          {log.type === 'IN' ? '+' : '-'}{log.qty}
                        </span>
                      </TableCell>
                      <TableCell>{log.pic}</TableCell>
                      <TableCell>
                        {log.dept_id !== '-' ? (
                           <Badge variant="outline" className="text-[#004aad] border-[#004aad]">
                             {log.dept_id}
                           </Badge>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}