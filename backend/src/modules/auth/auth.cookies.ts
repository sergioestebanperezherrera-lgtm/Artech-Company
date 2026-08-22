import type { Request, Response } from "express";
import { env } from "../../config/env";

const googleOAuthStateCookieName = "artech_google_oauth_state";

function getCookieValue(header: string | undefined, name: string) {
  if (!header) {
    return null;
  }

  const cookies = header.split(";");

  for (const cookie of cookies) {
    const [rawKey, ...rawValueParts] = cookie.trim().split("=");

    if (rawKey === name) {
      return decodeURIComponent(rawValueParts.join("="));
    }
  }

  return null;
}

export function getSessionTokenFromRequest(request: Request) {
  return getCookieValue(request.headers.cookie, env.authCookieName);
}

export function setSessionCookie(response: Response, token: string, expiresAt: Date) {
  response.cookie(env.authCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(env.authCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/",
  });
}

export function getGoogleOAuthStateHashFromRequest(request: Request) {
  return getCookieValue(request.headers.cookie, googleOAuthStateCookieName);
}

export function setGoogleOAuthStateCookie(
  response: Response,
  stateHash: string,
) {
  response.cookie(googleOAuthStateCookieName, stateHash, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/api/auth/google/callback",
    maxAge: 10 * 60 * 1000,
  });
}

export function clearGoogleOAuthStateCookie(response: Response) {
  response.clearCookie(googleOAuthStateCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/api/auth/google/callback",
  });
}
