import type { Request, Response } from "express";
import { getAdminIdentity } from "./admin.service";

export async function adminMeController(request: Request, response: Response) {
  response.status(200).json(getAdminIdentity(request));
}
