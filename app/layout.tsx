import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Footer, GlobalOverlays, Navbar } from "@/components/layout";
import { brandService } from "@/lib/services/brandService";
import { categoryService } from "@/lib/services/categoryService";
import { productService } from "@/lib/services/productService";
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
  const catalogPromise = Promise.all([
    productService.getAll(),
    categoryService.getAll(),
    brandService.getAll(),
  ]);

  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased">
        <CatalogChrome catalogPromise={catalogPromise}>{children}</CatalogChrome>
      </body>
    </html>
  );
}

async function CatalogChrome({
  catalogPromise,
  children,
}: Readonly<{
  catalogPromise: Promise<
    [
      Awaited<ReturnType<typeof productService.getAll>>,
      Awaited<ReturnType<typeof categoryService.getAll>>,
      Awaited<ReturnType<typeof brandService.getAll>>,
    ]
  >;
  children: React.ReactNode;
}>) {
  const [products, categories, brands] = await catalogPromise;

  return (
    <>
      <Navbar products={products} categories={categories} brands={brands} />
      <div className="relative z-10">{children}</div>
        <Footer />
      <GlobalOverlays products={products} />
    </>
  );
}
