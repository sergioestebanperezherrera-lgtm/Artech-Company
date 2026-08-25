import type { Request, Response } from "express";
import { getAuthContext } from "../auth/auth.middleware";
import {
  closeCashSession,
  createCashMovement,
  createCashRegister,
  getCashSession,
  getCurrentCashSession,
  listCashRegisters,
  openCashSession,
} from "./cash.service";
import {
  cashSessionParamsSchema,
  closeCashSessionSchema,
  createCashMovementSchema,
  createCashRegisterSchema,
  openCashSessionSchema,
  parseRequest,
} from "./cash.validation";

export async function listCashRegistersController(
  _request: Request,
  response: Response,
) {
  response.status(200).json(await listCashRegisters());
}

export async function createCashRegisterController(
  request: Request,
  response: Response,
) {
  const input = parseRequest(createCashRegisterSchema, request.body);
  response.status(201).json(await createCashRegister(input));
}

export async function currentCashSessionController(
  request: Request,
  response: Response,
) {
  const auth = getAuthContext(request);
  response.status(200).json(await getCurrentCashSession(auth.user.id));
}

export async function openCashSessionController(
  request: Request,
  response: Response,
) {
  const input = parseRequest(openCashSessionSchema, request.body);
  const auth = getAuthContext(request);
  response.status(201).json(await openCashSession(input, auth.user.id));
}

export async function getCashSessionController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(cashSessionParamsSchema, request.params);
  response.status(200).json(await getCashSession(id));
}

export async function createCashMovementController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(cashSessionParamsSchema, request.params);
  const input = parseRequest(createCashMovementSchema, request.body);
  const auth = getAuthContext(request);
  response.status(201).json(await createCashMovement(id, input, auth.user.id));
}

export async function closeCashSessionController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(cashSessionParamsSchema, request.params);
  const input = parseRequest(closeCashSessionSchema, request.body);
  const auth = getAuthContext(request);
  response.status(200).json(await closeCashSession(id, input, auth.user.id));
}
