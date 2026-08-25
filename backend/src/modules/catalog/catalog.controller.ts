import type { Request, Response } from "express";
import {
  adminCreateProduct,
  adminGetProduct,
  adminListBrands,
  adminListProducts,
  adminUpdateProduct,
} from "./catalog.service";
import {
  adminCreateProductSchema,
  adminProductListQuerySchema,
  adminUpdateProductSchema,
  parseRequest,
  productSlugParamsSchema,
} from "./catalog.validation";

export async function adminListProductsController(
  request: Request,
  response: Response,
) {
  const query = parseRequest(adminProductListQuerySchema, request.query);
  response.status(200).json(await adminListProducts(query));
}

export async function adminListBrandsController(
  _request: Request,
  response: Response,
) {
  response.status(200).json(await adminListBrands());
}

export async function adminGetProductController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(productSlugParamsSchema, request.params);
  response.status(200).json(await adminGetProduct(id));
}

export async function adminCreateProductController(
  request: Request,
  response: Response,
) {
  const input = parseRequest(adminCreateProductSchema, request.body);
  const product = await adminCreateProduct(input);
  response.status(201).json(product);
}

export async function adminUpdateProductController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(productSlugParamsSchema, request.params);
  const input = parseRequest(adminUpdateProductSchema, request.body);
  response.status(200).json(await adminUpdateProduct(id, input));
}
