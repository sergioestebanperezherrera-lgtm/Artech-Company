import type { Request, Response } from "express";
import { getAuthContext } from "../auth/auth.middleware";
import {
  adjustPayrollSlip,
  calculatePayrollPeriod,
  closePayrollPeriod,
  createPayrollPeriod,
  getPayrollPeriod,
  listPayrollPeriods,
} from "./payroll.service";
import {
  adjustPayrollSlipSchema,
  createPayrollPeriodSchema,
  parseRequest,
  payrollPeriodParamsSchema,
} from "./payroll.validation";

export async function listPayrollPeriodsController(
  _request: Request,
  response: Response,
) {
  response.status(200).json(await listPayrollPeriods());
}

export async function createPayrollPeriodController(
  request: Request,
  response: Response,
) {
  const input = parseRequest(createPayrollPeriodSchema, request.body);
  const auth = getAuthContext(request);
  const period = await createPayrollPeriod(input, auth.user.id);
  response.status(201).json(period);
}

export async function getPayrollPeriodController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(payrollPeriodParamsSchema, request.params);
  response.status(200).json(await getPayrollPeriod(id));
}

export async function calculatePayrollPeriodController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(payrollPeriodParamsSchema, request.params);
  response.status(200).json(await calculatePayrollPeriod(id));
}

export async function closePayrollPeriodController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(payrollPeriodParamsSchema, request.params);
  const auth = getAuthContext(request);
  response.status(200).json(await closePayrollPeriod(id, auth.user.id));
}

export async function adjustPayrollSlipController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(payrollPeriodParamsSchema, request.params);
  const input = parseRequest(adjustPayrollSlipSchema, request.body);
  const auth = getAuthContext(request);
  response.status(200).json(await adjustPayrollSlip(id, input, auth.user.id));
}
