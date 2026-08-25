import type { Request, Response } from "express";
import {
  createPosition,
  listPositions,
  updatePosition,
} from "./positions.service";
import {
  createPositionSchema,
  parseRequest,
  positionIdParamsSchema,
  updatePositionSchema,
} from "./employees.validation";

export async function listPositionsController(
  _request: Request,
  response: Response,
) {
  response.status(200).json(await listPositions());
}

export async function createPositionController(
  request: Request,
  response: Response,
) {
  const input = parseRequest(createPositionSchema, request.body);
  const result = await createPosition(input);
  response.status(201).json(result.data);
}

export async function updatePositionController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(positionIdParamsSchema, request.params);
  const input = parseRequest(updatePositionSchema, request.body);
  const result = await updatePosition(id, input);
  response.status(200).json(result.data);
}
