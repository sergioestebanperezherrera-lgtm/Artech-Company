import type { Request, Response } from "express";
import { getAuthContext } from "../auth/auth.middleware";
import {
  createManualMovement,
  listInventory,
  listMovements,
} from "./inventory.service";
import {
  createManualMovementSchema,
  inventoryListQuerySchema,
  movementListQuerySchema,
  parseRequest,
} from "./inventory.validation";

export async function listInventoryController(
  request: Request,
  response: Response,
) {
  const query = parseRequest(inventoryListQuerySchema, request.query);
  response.status(200).json(await listInventory(query));
}

export async function listMovementsController(
  request: Request,
  response: Response,
) {
  const query = parseRequest(movementListQuerySchema, request.query);
  response.status(200).json(await listMovements(query));
}

export async function createManualMovementController(
  request: Request,
  response: Response,
) {
  const input = parseRequest(createManualMovementSchema, request.body);
  const auth = getAuthContext(request);
  const movement = await createManualMovement(input, auth.user.id);
  response.status(201).json(movement);
}
