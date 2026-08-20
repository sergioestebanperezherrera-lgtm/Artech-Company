import { findActiveCategories } from "./categories.repository";

export async function getCategories() {
  const categories = await findActiveCategories();

  return categories.map((category) => ({
    id: category.slug,
    name: category.name,
    icon: category.icon,
  }));
}
