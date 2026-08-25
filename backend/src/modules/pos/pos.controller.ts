import type { Request, Response } from "express";
import { getAuthContext } from "../auth/auth.middleware";
import { createPosSale, getPosSale, listPosSales } from "./pos.service";
import {
  createPosSaleSchema,
  parseRequest,
  posSaleListQuerySchema,
  posSaleParamsSchema,
} from "./pos.validation";

export async function listPosSalesController(
  request: Request,
  response: Response,
) {
  const query = parseRequest(posSaleListQuerySchema, request.query);
  response.status(200).json(await listPosSales(query));
}

export async function getPosSaleController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(posSaleParamsSchema, request.params);
  response.status(200).json(await getPosSale(id));
}

export async function createPosSaleController(
  request: Request,
  response: Response,
) {
  const input = parseRequest(createPosSaleSchema, request.body);
  const auth = getAuthContext(request);
  const result = await createPosSale(input, auth.user.id);
  response.status(result.created ? 201 : 200).json(result.data);
}
