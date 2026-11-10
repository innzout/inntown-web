import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AppProvider } from "@/lib/store";
import "./globals.css";

// Self-hosted (OFL, same files as the apps): no Google Fonts download at build time.
const baloo = localFont({
  src: [
    { path: "./fonts/BalooThambi2-600.ttf", weight: "600" },
    { path: "./fonts/BalooThambi2-700.ttf", weight: "700" },
  ],
  variable: "--f-baloo",
  display: "swap",
});
const hind = localFont({
  src: [
    { path: "./fonts/HindMadurai-Regular.ttf", weight: "400" },
    { path: "./fonts/HindMadurai-Medium.ttf", weight: "500" },
    { path: "./fonts/HindMadurai-SemiBold.ttf", weight: "600 700" },
  ],
  variable: "--f-hind",
  display: "swap",
});

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
