import type { Request, Response } from "express";
import {
  handleGoogleCallback,
  login,
  logout,
  getCurrentAuth,
  register,
  startGoogleLogin,
} from "./auth.service";
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

export async function googleLoginController(_request: Request, response: Response) {
  const googleUrl = startGoogleLogin(response);

  response.redirect(302, googleUrl);
}

export async function googleCallbackController(
  request: Request,
  response: Response,
) {
  const redirectUrl = await handleGoogleCallback(request, response);

  response.redirect(302, redirectUrl);
}

export async function meController(request: Request, response: Response) {
  const result = await getCurrentAuth(request);

  response.status(200).json(result);
}

export async function logoutController(request: Request, response: Response) {
  const result = await logout(request, response);

  response.status(200).json(result);
}
