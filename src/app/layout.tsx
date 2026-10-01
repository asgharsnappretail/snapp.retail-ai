import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "SnappRetail Intelligence", template: "%s · SnappRetail Intelligence" },
  description: "Real-time retail surveillance analytics — SnappRetail x PSO",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${plexMono.variable} min-h-screen bg-[#03141B] font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}