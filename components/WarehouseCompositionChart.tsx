'use client';

import { useState, useMemo } from 'react';
import { PieChart, Pie, Sector, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { PieChart as PieIcon, Layers } from "lucide-react";

interface Product {
  id: string;
  name: string;
  stock: number;
  department_id: string;
}

interface Department {
    id: string;
    nama: string;
}

interface Props {
  products: Product[];
  departments?: Department[];
}

const COLORS = [
  "#004aad", "#0088FE", "#00C49F", "#FFBB28", "#FF8042", 
  "#a855f7", "#ec4899", "#64748b"
];

// --- HELPER: Split Text ---
const splitText = (text: string, maxLen: number = 20) => {
    if (!text) return [""];
    if (text.length <= maxLen) return [text];
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        if (currentLine.length + words[i].length + 1 <= maxLen) {
            currentLine += ' ' + words[i];
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    lines.push(currentLine);
    return lines;
}

// --- RENDER ACTIVE SHAPE ---
const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { 
    cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, 
    fill, payload, percent, value 
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  const nameLines = splitText(payload.name, 20);
  const lineHeight = 16; 
  const startY = ey - ((nameLines.length - 1) * lineHeight) / 2;

  return (
    <g>
      <text x={cx} y={cy} dy={-4} textAnchor="middle" fill={fill} className="text-3xl font-bold">
        {value}
      </text>
      <text x={cx} y={cy} dy={16} textAnchor="middle" fill="#999" className="text-xs font-medium">
        Unit
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill} />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={startY} textAnchor={textAnchor} fill="#333" className="text-sm font-semibold">
        {nameLines.map((line, index) => (
            <tspan key={index} x={ex + (cos >= 0 ? 1 : -1) * 12} dy={index === 0 ? 0 : lineHeight}>
                {line}
            </tspan>
        ))}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={startY + (nameLines.length * lineHeight) + 4} textAnchor={textAnchor} fill="#999" className="text-xs">
        {`(${(percent * 100).toFixed(1)}%)`}
      </text>
    </g>
  );
};

// --- KOMPONEN UTAMA (PERBAIKAN DI SINI) ---
// Perhatikan: products = [] (Default value agar tidak undefined)
export default function WarehouseCompositionChart({ products = [], departments = [] }: Props) {
  const [activeIndexDept, setActiveIndexDept] = useState(0);
  const [activeIndexProd, setActiveIndexProd] = useState(0);
  const [selectedDept, setSelectedDept] = useState<string>("");

  const getDeptName = (id: string) => {
      const dept = departments.find(d => d.id === id);
      return dept ? dept.nama : id;
  };

  const deptChartData = useMemo(() => {
    // Safety Check: Jika products undefined/null, return array kosong
    if (!products) return [];

    const stats: Record<string, number> = {};
    products.forEach(p => {
        const d = p.department_id || "Unknown";
        stats[d] = (stats[d] || 0) + p.stock;
    });
    
    const data = Object.keys(stats).map(key => ({ 
        name: getDeptName(key),
        id: key,
        value: stats[key] 
    }));
    
    data.sort((a, b) => b.value - a.value);
    
    if (!selectedDept && data.length > 0) {
        setSelectedDept(data[0].id);
    }
    
    return data;
  }, [products, departments]); // eslint-disable-line

  const prodChartData = useMemo(() => {
    // Safety Check lagi
    if (!selectedDept || !products) return [];

    const filtered = products.filter(p => p.department_id === selectedDept);
    let data = filtered.map(p => ({ name: p.name, value: p.stock }));
    data.sort((a, b) => b.value - a.value);

    if (data.length > 6) {
        const top5 = data.slice(0, 5);
        const others = data.slice(5).reduce((acc, curr) => acc + curr.value, 0);
        return [...top5, { name: "Lainnya", value: others }];
    }
    return data;
  }, [products, selectedDept]);

  const onPieEnterDept = (_: any, index: number) => setActiveIndexDept(index);
  const onPieClickDept = (data: any, index: number) => {
      setActiveIndexDept(index);
      setSelectedDept(data.id);
  };
  const onPieEnterProd = (_: any, index: number) => setActiveIndexProd(index);

  const PieAny = Pie as any;

  // --- EMPTY STATE CHECK ---
  // Jika products ada tapi kosong (length 0), tampilkan pesan ramah
  if (products.length === 0) {
    return (
        <div className="w-full p-10 text-center border-2 border-dashed rounded-lg bg-gray-50 text-gray-400">
            <Layers className="w-10 h-10 mx-auto mb-2 opacity-50"/>
            <p>Belum ada data produk untuk ditampilkan.</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
        
        {/* CHART 1: KOMPOSISI DEPARTEMEN */}
        <Card className="shadow-sm border-t-4 border-t-blue-600">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-600"/> Komposisi Gudang
                </CardTitle>
                <CardDescription>Total stok dikelompokkan berdasarkan Departemen.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <PieAny
                            activeIndex={activeIndexDept}
                            activeShape={renderActiveShape}
                            data={deptChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={90}
                            fill="#004aad"
                            dataKey="value"
                            onMouseEnter={onPieEnterDept}
                            onClick={onPieClickDept}
                            cursor="pointer"
                        >
                            {deptChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </PieAny>
                    </PieChart>
                </ResponsiveContainer>
                <p className="text-center text-xs text-gray-400 mt-[-20px]">
                    *Klik potongan pie untuk melihat detail
                </p>
            </CardContent>
        </Card>

        {/* CHART 2: DETAIL PRODUK */}
        <Card className="shadow-sm border-t-4 border-t-orange-500">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        <PieIcon className="w-5 h-5 text-orange-500"/> Detail Produk
                    </CardTitle>
                    <CardDescription>
                        Stok di: <span className="font-semibold text-gray-700">{getDeptName(selectedDept)}</span>
                    </CardDescription>
                </div>
                
                <div className="w-[180px]">
                    <Select value={selectedDept} onValueChange={setSelectedDept}>
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="Pilih Dept" />
                        </SelectTrigger>
                        <SelectContent>
                            {deptChartData.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                    {d.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="h-[400px] w-full">
                {prodChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <PieAny
                                activeIndex={activeIndexProd}
                                activeShape={renderActiveShape}
                                data={prodChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={65}
                                outerRadius={90}
                                fill="#82ca9d"
                                dataKey="value"
                                onMouseEnter={onPieEnterProd}
                            >
                                {prodChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                                ))}
                            </PieAny>
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <p>Tidak ada produk di departemen ini.</p>
                    </div>
                )}
            </CardContent>
        </Card>

    </div>
  );
}