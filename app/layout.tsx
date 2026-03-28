import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import LoadingProvider from "@/app/components/LoadingProvider";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const notoSerif = Noto_Serif_KR({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "빈 무덤 프로젝트",
  description: "40일, 매일 죽고 예수로 사는 삶의 실전편",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F8F3EA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geist.variable} ${notoSerif.variable} antialiased`}>
        <LoadingProvider>{children}</LoadingProvider>
      </body>
    </html>
  );
}
