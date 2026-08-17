import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/product";
import { categoryService } from "@/lib/services/categoryService";
import { productService } from "@/lib/services/productService";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return productService.getAll().map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = productService.getBySlug(slug);

  if (!product) {
    return {
      title: "Producto no encontrado | Artech",
    };
  }

  return {
    title: `${product.name} | Artech`,
    description: product.shortSpecs.join(" · "),
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = productService.getBySlug(slug);
  const category = product
    ? categoryService
        .getAll()
        .find((candidate) => candidate.id === product.category)
    : undefined;

  if (!product) {
    notFound();
  }

  return (
    <ProductDetailView
      product={product}
      categoryName={category?.name ?? product.category}
      relatedProducts={productService.getRelated(product)}
    />
  );
}
