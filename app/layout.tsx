import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Footer, GlobalOverlays, Navbar } from "@/components/layout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Artech",
  description: "E-commerce de tecnología y electrónica.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased">
        <Navbar />
        <div className="relative z-10">{children}</div>
        <Footer />
        <GlobalOverlays />
      </body>
    </html>
  );
}
