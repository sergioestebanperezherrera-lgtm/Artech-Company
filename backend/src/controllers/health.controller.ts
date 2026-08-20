import type { Request, Response } from "express";
import { getHealthStatus } from "../services/health.service";

export function healthController(_request: Request, response: Response) {
  response.status(200).json(getHealthStatus());
}
