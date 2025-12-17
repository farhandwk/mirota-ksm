import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Inisialisasi Auth
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});

export const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID as string, serviceAccountAuth);

export const loadSpreadsheet = async () => {
  await doc.loadInfo();
  return doc;
};

export const SHEET_TITLES = {
  DEPARTMENTS: 'departemen',
  PRODUCTS: 'produk',
  TRANSACTIONS: 'transaksi',
  DEPARTEMENTS: 'departemen',
  UNITS: 'satuan',
  USERS: 'users',
  CONFIG: 'konfigurasi'
};