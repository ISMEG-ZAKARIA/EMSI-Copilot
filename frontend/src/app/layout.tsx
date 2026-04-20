import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/hooks/AuthContext';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EMSI Copilot",
  description: "Assistant académique intelligent",
  icons: {
    icon: "/LOGO/image.png",
    shortcut: "/LOGO/image.png",
    apple: "/LOGO/image.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.className} bg-[#0d1117] antialiased selection:bg-[#2ea043]/30 selection:text-[#2ea043]`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
