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

  return (
    <CatalogView
      key={`${params?.categoria ?? ""}:${params?.buscar ?? ""}`}
      products={productService.getAll()}
      categories={categoryService.getAll()}
      brands={brandService.getAll()}
      initialCategory={params?.categoria}
      initialSearch={params?.buscar}
    />
  );
}
