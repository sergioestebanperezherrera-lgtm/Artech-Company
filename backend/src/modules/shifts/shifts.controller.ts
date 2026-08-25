import type { Request, Response } from "express";
import {
  createShift,
  createShiftAssignment,
  getEmployeeShifts,
  listShifts,
  updateShift,
} from "./shifts.service";
import {
  createShiftAssignmentSchema,
  createShiftSchema,
  employeeShiftParamsSchema,
  parseRequest,
  shiftIdParamsSchema,
  updateShiftSchema,
} from "./shifts.validation";

export async function listShiftsController(
  _request: Request,
  response: Response,
) {
  response.status(200).json(await listShifts());
}

export async function createShiftController(
  request: Request,
  response: Response,
) {
  const input = parseRequest(createShiftSchema, request.body);
  response.status(201).json(await createShift(input));
}

export async function updateShiftController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(shiftIdParamsSchema, request.params);
  const input = parseRequest(updateShiftSchema, request.body);
  response.status(200).json(await updateShift(id, input));
}

export async function getEmployeeShiftsController(
  request: Request,
  response: Response,
) {
  const { employeeId } = parseRequest(employeeShiftParamsSchema, request.params);
  response.status(200).json(await getEmployeeShifts(employeeId));
}

export async function createShiftAssignmentController(
  request: Request,
  response: Response,
) {
  const { employeeId } = parseRequest(employeeShiftParamsSchema, request.params);
  const input = parseRequest(createShiftAssignmentSchema, request.body);
  response.status(201).json(await createShiftAssignment(employeeId, input));
}
