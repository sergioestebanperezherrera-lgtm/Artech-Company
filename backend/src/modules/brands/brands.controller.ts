import type { Request, Response } from "express";
import { getBrands } from "./brands.service";

export async function listBrandsController(_request: Request, response: Response) {
  const brands = await getBrands();
  response.status(200).json(brands);
}
