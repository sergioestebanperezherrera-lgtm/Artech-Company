import type { Request, Response } from "express";
import { getCategories } from "./categories.service";

export async function listCategoriesController(
  _request: Request,
  response: Response,
) {
  const categories = await getCategories();
  response.status(200).json(categories);
}
