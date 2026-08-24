import { AppError } from "../../errors/app-error";
import { env } from "../../config/env";
import { OAuth2Client } from "google-auth-library";
import {
  clearGoogleOAuthStateCookie,
  clearSessionCookie,
  getGoogleOAuthStateHashFromRequest,
  getSessionTokenFromRequest,
  setGoogleOAuthStateCookie,
  setSessionCookie,
} from "./auth.cookies";
import {
  generateOAuthState,
  generateSessionToken,
  hashOAuthState,
  hashPassword,
  hashSessionToken,
  safeCompare,
  verifyPassword,
} from "./auth.crypto";
import { mapAuthUser } from "./auth.mapper";
import { getAuthContext } from "./auth.middleware";
import {
  createGoogleUser,
  createLocalUser,
  createSession,
  deleteSessionByTokenHash,
  findGoogleAuthAccount,
  findUserByEmail,
  linkGoogleAuthAccount,
} from "./auth.repository";
import { cleanupExpiredSessions, getSessionExpiresAt } from "./auth.session";
import type { LoginInput, RegisterInput } from "./auth.validation";
import type { Request, Response } from "express";

const invalidCredentialsMessage = "Invalid email or password.";
const googleOAuthScopes = ["openid", "email", "profile"];

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

function buildFrontendRedirect(path: string, params?: Record<string, string>) {
  const redirectUrl = new URL(path, env.frontendUrl);

  for (const [key, value] of Object.entries(params ?? {})) {
    redirectUrl.searchParams.set(key, value);
  }

  return redirectUrl.toString();
}

function getGoogleClient() {
  if (!env.googleClientId || !env.googleClientSecret || !env.googleRedirectUri) {
    throw new AppError("Google OAuth is not configured.", 503);
  }

  return new OAuth2Client(
    env.googleClientId,
    env.googleClientSecret,
    env.googleRedirectUri,
  );
}

function getGoogleErrorRedirect() {
  return buildFrontendRedirect("/cuenta", {
    auth: "google_error",
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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

export function startGoogleLogin(response: Response) {
  const googleClient = getGoogleClient();
  const state = generateOAuthState();

  setGoogleOAuthStateCookie(response, hashOAuthState(state));

  return googleClient.generateAuthUrl({
    redirect_uri: env.googleRedirectUri,
    response_type: "code",
    scope: googleOAuthScopes,
    state,
  });
}

export async function handleGoogleCallback(request: Request, response: Response) {
  const { code, error, state } = request.query;
  const stateHashFromCookie = getGoogleOAuthStateHashFromRequest(request);

  clearGoogleOAuthStateCookie(response);

  if (typeof error === "string") {
    return getGoogleErrorRedirect();
  }

  if (
    typeof code !== "string" ||
    typeof state !== "string" ||
    !stateHashFromCookie ||
    !safeCompare(hashOAuthState(state), stateHashFromCookie)
  ) {
    return getGoogleErrorRedirect();
  }

  try {
    const googleClient = getGoogleClient();
    const tokenResponse = await googleClient.getToken(code);
    const idToken = tokenResponse.tokens.id_token;

    if (!idToken) {
      return getGoogleErrorRedirect();
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      return getGoogleErrorRedirect();
    }

    const issuer = payload.iss;
    const audience = payload.aud;

    if (
      (issuer !== "https://accounts.google.com" && issuer !== "accounts.google.com") ||
      audience !== env.googleClientId ||
      !payload.sub ||
      !payload.email ||
      payload.email_verified !== true
    ) {
      return getGoogleErrorRedirect();
    }

    const googleSub = payload.sub;
    const email = normalizeEmail(payload.email);
    const name = payload.name?.trim() || email.split("@")[0] || "Artech User";
    const existingAuthAccount = await findGoogleAuthAccount(googleSub);

    if (existingAuthAccount) {
      if (!existingAuthAccount.user.isActive) {
        return getGoogleErrorRedirect();
      }

      await issueSession(response, existingAuthAccount.user.id);
      return buildFrontendRedirect("/cuenta");
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      if (!existingUser.isActive) {
        return getGoogleErrorRedirect();
      }

      const linkedUser = await linkGoogleAuthAccount({
        userId: existingUser.id,
        googleSub,
      });

      await issueSession(response, linkedUser.id);
      return buildFrontendRedirect("/cuenta");
    }

    const user = await createGoogleUser({
      name,
      email,
      googleSub,
    });

    await issueSession(response, user.id);

    return buildFrontendRedirect("/cuenta");
  } catch {
    return getGoogleErrorRedirect();
  }
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

export function getCurrentAuth(request: Request) {
  const session = getAuthContext(request);
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
