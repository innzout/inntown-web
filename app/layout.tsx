import type { Metadata, Viewport } from "next";
import { Baloo_Thambi_2, Hind_Madurai } from "next/font/google";
import { AppProvider } from "@/lib/store";
import "./globals.css";

const baloo = Baloo_Thambi_2({ subsets: ["latin", "tamil"], weight: ["600", "700"], variable: "--f-baloo", display: "swap" });
const hind = Hind_Madurai({ subsets: ["latin", "tamil"], weight: ["400", "500", "600", "700"], variable: "--f-hind", display: "swap" });

export const metadata: Metadata = {
  title: "InnTown Hotel",
  description: "Accept orders, manage your menu and see your earnings on InnTown.",
};

export const viewport: Viewport = { themeColor: "#1D6B45", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${baloo.variable} ${hind.variable}`}>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
