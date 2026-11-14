
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import TelegramProvider from "@/components/providers/TelegramProvider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

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
        <TelegramProvider>
          {children}
        </TelegramProvider>
      </body>
    </html>
  );
}
