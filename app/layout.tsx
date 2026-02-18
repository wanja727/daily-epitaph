import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "오늘의 묘비명",
  description: "신앙 안에서의 하루를 한 문장으로 기록하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geist.variable} antialiased font-sans`}>
        <div className="min-h-screen bg-stone-50 text-stone-800">
          {children}
        </div>
      </body>
    </html>
  );
}
