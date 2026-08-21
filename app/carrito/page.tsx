import { CartPageView } from "@/components/cart";
import { productService } from "@/lib/services/productService";

export default async function CartPage() {
  const products = await productService.getAll();

  return <CartPageView products={products} />;
}
