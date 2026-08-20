import { findActiveBrands } from "./brands.repository";

export async function getBrands() {
  const brands = await findActiveBrands();

  return brands.map((brand) => ({
    id: brand.slug,
    name: brand.name,
    logo: brand.logoUrl,
  }));
}
