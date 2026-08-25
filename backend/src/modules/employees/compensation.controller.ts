import type { Request, Response } from "express";
import {
  createCompensationPeriod,
  getEmployeeCompensation,
} from "./compensation.service";
import {
  createCompensationPeriodSchema,
  employeeCompensationParamsSchema,
  parseRequest,
} from "./compensation.validation";

export async function getEmployeeCompensationController(
  request: Request,
  response: Response,
) {
  const { employeeId } = parseRequest(
    employeeCompensationParamsSchema,
    request.params,
  );
  response.status(200).json(await getEmployeeCompensation(employeeId));
}

export async function createCompensationPeriodController(
  request: Request,
  response: Response,
) {
  const { employeeId } = parseRequest(
    employeeCompensationParamsSchema,
    request.params,
  );
  const input = parseRequest(createCompensationPeriodSchema, request.body);
  response.status(201).json(await createCompensationPeriod(employeeId, input));
}
