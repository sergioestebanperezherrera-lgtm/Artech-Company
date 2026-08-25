import type { Request, Response } from "express";
import {
  adminCreateCategory,
  adminListCategories,
  adminUpdateCategory,
} from "./catalog.service";
import {
  adminCreateCategorySchema,
  adminUpdateCategorySchema,
  parseRequest,
  productSlugParamsSchema,
} from "./catalog.validation";

export async function adminListCategoriesController(
  _request: Request,
  response: Response,
) {
  response.status(200).json(await adminListCategories());
}

export async function adminCreateCategoryController(
  request: Request,
  response: Response,
) {
  const input = parseRequest(adminCreateCategorySchema, request.body);
  const category = await adminCreateCategory(input);
  response.status(201).json(category);
}

export async function adminUpdateCategoryController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(productSlugParamsSchema, request.params);
  const input = parseRequest(adminUpdateCategorySchema, request.body);
  response.status(200).json(await adminUpdateCategory(id, input));
}
