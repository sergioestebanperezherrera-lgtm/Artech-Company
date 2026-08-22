import { AppError } from "../../errors/app-error";
import { clearSessionCookie, getSessionTokenFromRequest, setSessionCookie } from "./auth.cookies";
import {
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "./auth.crypto";
import { mapAuthUser } from "./auth.mapper";
import {
  createLocalUser,
  createSession,
  deleteSessionByTokenHash,
  findUserByEmail,
} from "./auth.repository";
import { cleanupExpiredSessions, getSessionExpiresAt, resolveAuthSession } from "./auth.session";
import type { LoginInput, RegisterInput } from "./auth.validation";
import type { Request, Response } from "express";

const invalidCredentialsMessage = "Invalid email or password.";

async function issueSession(response: Response, userId: string) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = getSessionExpiresAt();

  await createSession({
    userId,
    tokenHash,
    expiresAt,
  });

  setSessionCookie(response, token, expiresAt);
}

export async function register(input: RegisterInput, response: Response) {
  await cleanupExpiredSessions();

  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    throw new AppError("Email is already registered.", 409);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createLocalUser({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  await issueSession(response, user.id);

  return mapAuthUser(user);
}

export async function login(input: LoginInput, response: Response) {
  await cleanupExpiredSessions();

  const user = await findUserByEmail(input.email);

  if (!user || !user.isActive) {
    throw new AppError(invalidCredentialsMessage, 401);
  }

  if (!user.passwordHash) {
    throw new AppError(invalidCredentialsMessage, 401);
  }

  const isPasswordValid = await verifyPassword(user.passwordHash, input.password);

  if (!isPasswordValid) {
    throw new AppError(invalidCredentialsMessage, 401);
  }

  await issueSession(response, user.id);

  return mapAuthUser(user);
}

export async function getCurrentAuth(request: Request) {
  const session = await resolveAuthSession(request);

  if (!session) {
    throw new AppError("Authentication required.", 401);
  }

  return mapAuthUser(session.user);
}

export async function logout(request: Request, response: Response) {
  const token = getSessionTokenFromRequest(request);

  if (token) {
    await deleteSessionByTokenHash(hashSessionToken(token));
  }

  clearSessionCookie(response);

  return {
    message: "Logged out.",
  };
}
