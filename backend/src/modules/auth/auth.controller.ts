import type { Request, Response } from "express";
import { login, logout, getCurrentAuth, register } from "./auth.service";
import { loginSchema, parseRequestBody, registerSchema } from "./auth.validation";

export async function registerController(request: Request, response: Response) {
  const input = parseRequestBody(registerSchema, request.body);
  const result = await register(input, response);

  response.status(201).json(result);
}

export async function loginController(request: Request, response: Response) {
  const input = parseRequestBody(loginSchema, request.body);
  const result = await login(input, response);

  response.status(200).json(result);
}

export async function meController(request: Request, response: Response) {
  const result = await getCurrentAuth(request);

  response.status(200).json(result);
}

export async function logoutController(request: Request, response: Response) {
  const result = await logout(request, response);

  response.status(200).json(result);
}
