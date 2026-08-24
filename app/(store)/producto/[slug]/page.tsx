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

export async function generateStaticParams() {
  const products = await productService.getAll();

  return products.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await productService.getBySlug(slug);

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
  const product = await productService.getBySlug(slug);

  if (!product) {
    notFound();
  }

  const [categories, relatedProducts] = await Promise.all([
    categoryService.getAll(),
    productService.getRelated(product),
  ]);
  const category = categories.find((candidate) => candidate.id === product.category);

  return (
    <ProductDetailView
      product={product}
      categoryName={category?.name ?? product.category}
      relatedProducts={relatedProducts}
    />
  );
}
