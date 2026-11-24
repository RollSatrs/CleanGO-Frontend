
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { Manrope, Geist_Mono } from "next/font/google";

import TelegramProvider from "@/components/providers/TelegramProvider";

import "./globals.css";

const geistSans = Manrope({
  variable: "--font-cleango-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export const metadata: Metadata = {
  title: "CleanGo — уборка вашего дома",

  description:
    "CleanGo — удобный сервис заказа профессиональной уборки.",

  icons: {
    icon: [
      {
        url: "/images/cleango/CleanGo-logo.png",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/images/cleango/CleanGo-logo.png",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <Suspense fallback={<main className="flex min-h-dvh items-center justify-center bg-[#EFF8FC]"><p className="text-sm text-[#7891A3]">Запускаем CleanGo...</p></main>}>
          <TelegramProvider>
            {children}
          </TelegramProvider>
        </Suspense>
      </body>
    </html>
  );
}
