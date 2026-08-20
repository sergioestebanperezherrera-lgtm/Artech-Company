import type { Request, Response } from "express";
import { getProductBySlug, getProducts } from "./products.service";

export async function listProductsController(_request: Request, response: Response) {
  const products = await getProducts();
  response.status(200).json(products);
}

export async function getProductController(request: Request, response: Response) {
  const product = await getProductBySlug(request.params.slug);
  response.status(200).json(product);
}
