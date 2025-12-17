import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { loadSpreadsheet, SHEET_TITLES } from "../../../../lib/googleSheets";

// Opsi konfigurasi dipisah agar lebih rapi & stabil
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          console.log("Mencoba login untuk:", credentials.username); // Debug Log

          const doc = await loadSpreadsheet();
          const sheet = doc.sheetsByTitle[SHEET_TITLES.USERS];
          
          if (!sheet) {
            console.error("Critical: Sheet 'users' tidak ditemukan!");
            throw new Error("Sheet users not found");
          }

          const rows = await sheet.getRows();
          const userRow = rows.find((row) => row.get('username') === credentials.username);

          if (userRow) {
            const dbPass = userRow.get('password');
            const role = userRow.get('role');
            const fullname = userRow.get('fullname');

            console.log("User ditemukan:", fullname, "| Role:", role); // Debug Log

            if (dbPass === credentials.password) {
              return {
                id: credentials.username,
                name: fullname,
                role: role, 
              };
            } else {
              console.log("Password salah.");
            }
          } else {
            console.log("Username tidak ditemukan.");
          }
          return null;
        } catch (error) {
          console.error("Authorize Error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) token.role = user.role;
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) session.user.role = token.role;
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  // Wajib ada untuk production / localhost
  secret: process.env.NEXTAUTH_SECRET,
  // Nyalakan debug agar error detail muncul di terminal
  debug: true, 
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };