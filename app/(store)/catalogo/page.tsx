import { CatalogView } from "@/components/catalog";
import { brandService } from "@/lib/services/brandService";
import { categoryService } from "@/lib/services/categoryService";
import { productService } from "@/lib/services/productService";

type CatalogPageProps = {
  searchParams?: Promise<{
    categoria?: string;
    buscar?: string;
  }>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const [products, categories, brands] = await Promise.all([
    productService.getAll(),
    categoryService.getAll(),
    brandService.getAll(),
  ]);

  return (
    <CatalogView
      key={`${params?.categoria ?? ""}:${params?.buscar ?? ""}`}
      products={products}
      categories={categories}
      brands={brands}
      initialCategory={params?.categoria}
      initialSearch={params?.buscar}
    />
  );
}
