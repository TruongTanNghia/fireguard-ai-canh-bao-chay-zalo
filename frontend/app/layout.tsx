import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/src/contexts/AuthContext";
import { FireAlertProvider } from "@/src/contexts/FireAlertContext";
import Navbar from "@/src/components/layout/Navbar";
import Sidebar from "@/src/components/layout/Sidebar";
import EmergencyBanner from "@/src/components/common/EmergencyBanner";

const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FIREGUARD AI PRO - Giám Sát Báo Cháy & Cảnh Báo Zalo",
  description: "Hệ thống giám sát phát hiện ngọn lửa và khói bằng AI YOLOv8s & gửi cảnh báo Zalo tự động",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className={`${inter.className} bg-[var(--ui-canvas)] text-[var(--ui-text)] min-h-screen flex flex-col antialiased selection:bg-orange-500 selection:text-white`}>
        <AuthProvider>
          <FireAlertProvider>
            <Navbar />
            <div className="flex-1 flex overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 bg-[var(--ui-canvas)]">
                {children}
              </main>
            </div>
            <EmergencyBanner />
          </FireAlertProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
