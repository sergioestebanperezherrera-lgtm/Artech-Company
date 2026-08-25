import type { Request, Response } from "express";
import { getAuthContext } from "../auth/auth.middleware";
import {
  clockIn,
  clockOut,
  listAttendance,
  listEmployeeAttendance,
  overrideAttendance,
} from "./attendance.service";
import {
  attendanceIdParamsSchema,
  attendanceListQuerySchema,
  clockInSchema,
  clockOutSchema,
  employeeAttendanceParamsSchema,
  overrideAttendanceSchema,
  parseRequest,
} from "./attendance.validation";

export async function listAttendanceController(
  request: Request,
  response: Response,
) {
  const query = parseRequest(attendanceListQuerySchema, request.query);
  response.status(200).json(await listAttendance(query));
}

export async function listEmployeeAttendanceController(
  request: Request,
  response: Response,
) {
  const { employeeId } = parseRequest(
    employeeAttendanceParamsSchema,
    request.params,
  );
  const query = parseRequest(attendanceListQuerySchema, request.query);
  response.status(200).json(await listEmployeeAttendance(employeeId, query));
}

export async function clockInController(request: Request, response: Response) {
  const input = parseRequest(clockInSchema, request.body);
  response.status(201).json(await clockIn(input));
}

export async function clockOutController(request: Request, response: Response) {
  const input = parseRequest(clockOutSchema, request.body);
  response.status(200).json(await clockOut(input));
}

export async function overrideAttendanceController(
  request: Request,
  response: Response,
) {
  const { id } = parseRequest(attendanceIdParamsSchema, request.params);
  const input = parseRequest(overrideAttendanceSchema, request.body);
  const auth = getAuthContext(request);
  response.status(200).json(await overrideAttendance(id, input, auth.user.id));
}
