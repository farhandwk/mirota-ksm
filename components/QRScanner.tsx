'use client';

import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function QRScanner({ onScanSuccess, onScanFailure }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Inisialisasi Scanner dengan ID elemen "reader"
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] // Hanya fokus ke QR Code agar lebih cepat
    };

    // 2. Mulai scanning dengan preferensi kamera belakang ("environment")
    // Ini akan melewati dropdown pemilihan kamera.
    html5QrCode.start(
      { facingMode: "environment" }, // "user" untuk kamera depan, "environment" untuk belakang
      config,
      (decodedText) => {
        // Sukses baca QR
        onScanSuccess(decodedText);
        // Stop camera setelah sukses agar hemat baterai & tidak double scan
        html5QrCode.stop().catch(err => console.error("Gagal stop kamera", err));
      },
      (errorMessage) => {
        // Gagal baca frame (terlalu sering dipanggil, jadi kita abaikan atau log saja)
        // if (onScanFailure) onScanFailure(errorMessage); 
      }
    ).catch((err) => {
      // Error serius saat memulai kamera (misal: izin ditolak)
      console.error("Error memulai kamera:", err);
      setScanError("Gagal mengakses kamera. Pastikan izin telah diberikan.");
    });

    // 3. Cleanup saat komponen ditutup/unmount
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop()
          .then(() => scannerRef.current?.clear())
          .catch(error => console.error("Gagal cleanup scanner", error));
      }
    };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden bg-black">
      {/* Tempat kamera akan muncul */}
      <div id="reader" className="w-full h-full"></div>

      {/* Pesan error jika kamera gagal dibuka */}
      {scanError && (
        <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/80">
          <p className="text-white text-center font-semibold">{scanError}</p>
        </div>
      )}
    </div>
  );
}