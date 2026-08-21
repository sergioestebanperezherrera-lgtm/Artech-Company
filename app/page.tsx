import {
  BrandHeroSection,
  CategoryGrid,
  FeaturedProductsShowcase,
  HeroSection,
  SectionHeader,
  TrustSection,
} from "@/components/home";
import { ScrollReveal } from "@/components/motion";
import { categoryService } from "@/lib/services/categoryService";
import { productService } from "@/lib/services/productService";

export default async function HomePage() {
  const [offers, categories, newArrivals] = await Promise.all([
    productService.getOffers(),
    categoryService.getAll(),
    productService.getNewArrivals(),
  ]);

  return (
    <main className="artech-page-shell min-h-screen text-text-primary-on-dark">
      <BrandHeroSection />
      <HeroSection products={offers} />
      <FeaturedProductsShowcase categories={categories} products={newArrivals} />

      <section className="artech-dark-section artech-categories-section px-4 py-16 sm:px-6 lg:py-20">
        <ScrollReveal className="mx-auto max-w-6xl">
          <SectionHeader
            title="EXPLORA ARTECH"
            description="Encuentra lo que buscas."
          />
          <CategoryGrid categories={categories} />
        </ScrollReveal>
      </section>

      <section className="artech-dark-section artech-benefits-section px-4 py-10 pb-20 sm:px-6 lg:py-12 lg:pb-24">
        <ScrollReveal className="mx-auto max-w-6xl">
          <TrustSection />
        </ScrollReveal>
      </section>
    </main>
  );
}
