import localFont from 'next/font/local';

export const helvetica = localFont({
  src: [
    {
      path: '../src/font/helvetica-light-587ebe5a59211.woff', // Sesuaikan path jika berbeda
      weight: '400',
      style: 'normal',
    },
    {
      path: '../src/font/Helvetica-Bold.woff',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../src/font/Helvetica-Oblique.woff',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../src/font/Helvetica-BoldOblique.woff',
      weight: '700',
      style: 'italic',
    },
    // Tambahkan Light atau Rounded jika ingin dipakai
    {
      path: '../src/font/helvetica-light-587ebe5a59211.woff', // Ganti nama file sesuai aslinya
      weight: '300',
      style: 'normal',
    },
  ],
  variable: '--font-helvetica', // Ini nama variabel CSS yang akan kita pakai di Tailwind
  display: 'swap',
});