import { z } from "zod";

export const productSchema = z.object({
  nama_produk: z.string().min(3, "Nama produk minimal 3 huruf"),
  id_departemen: z.string().min(1, "Departemen harus dipilih"),
  satuan: z.string().min(1, "Satuan harus dipilih"),
});

export type ProductInput = z.infer<typeof productSchema>;

export const transactionSchema = z.object({
  qr_code: z.string().min(1, "QR Code tidak boleh kosong"),
  type: z.enum(["IN", "OUT"]), // Hanya boleh IN atau OUT
  quantity: z.number().min(1, "Jumlah minimal 1"),
  department_id: z.string().optional(), // Wajib ada jika type = IN (untuk validasi salah kamar)
  petugas: z.string().min(1, "Nama petugas wajib diisi") // Nanti diambil dari sesi login
});