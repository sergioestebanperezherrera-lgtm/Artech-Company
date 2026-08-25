import type { Request, Response } from "express";
import {
  changeEmployeePosition,
  createEmployee,
  getEmployee,
  listEmployees,
  reactivateEmployee,
  terminateEmployee,
  updateEmployee,
} from "./employees.service";
import {
  changePositionSchema,
  createEmployeeSchema,
  employeeIdParamsSchema,
  employeeListQuerySchema,
  parseRequest,
  reactivateEmployeeSchema,
  terminateEmployeeSchema,
  updateEmployeeSchema,
} from "./employees.validation";

export async function listEmployeesController(
  request: Request,
  response: Response,
) {
  const query = parseRequest(employeeListQuerySchema, request.query);
  response.status(200).json(await listEmployees(query));
}

export async function getEmployeeController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(employeeIdParamsSchema, request.params);
  response.status(200).json(await getEmployee(id));
}

export async function createEmployeeController(
  request: Request,
  response: Response,
) {
  const input = parseRequest(createEmployeeSchema, request.body);
  const result = await createEmployee(input);
  response.status(201).json(result.data);
}

export async function updateEmployeeController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(employeeIdParamsSchema, request.params);
  const input = parseRequest(updateEmployeeSchema, request.body);
  const result = await updateEmployee(id, input);
  response.status(200).json(result.data);
}

export async function changeEmployeePositionController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(employeeIdParamsSchema, request.params);
  const input = parseRequest(changePositionSchema, request.body);
  const result = await changeEmployeePosition(id, input);
  response.status(200).json(result.data);
}

export async function terminateEmployeeController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(employeeIdParamsSchema, request.params);
  const input = parseRequest(terminateEmployeeSchema, request.body);
  const result = await terminateEmployee(id, input);
  response.status(200).json(result.data);
}

export async function reactivateEmployeeController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(employeeIdParamsSchema, request.params);
  const input = parseRequest(reactivateEmployeeSchema, request.body);
  const result = await reactivateEmployee(id, input);
  response.status(200).json(result.data);
}
