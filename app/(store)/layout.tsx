import { Footer, GlobalOverlays, Navbar } from "@/components/layout";
import { brandService } from "@/lib/services/brandService";
import { categoryService } from "@/lib/services/categoryService";
import { productService } from "@/lib/services/productService";

export default async function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [products, categories, brands] = await Promise.all([
    productService.getAll(),
    categoryService.getAll(),
    brandService.getAll(),
  ]);

  return (
    <>
      <Navbar products={products} categories={categories} brands={brands} />
      <div className="relative z-10">{children}</div>
      <Footer />
      <GlobalOverlays products={products} />
    </>
  );
}
