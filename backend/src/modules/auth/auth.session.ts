import type { Request } from "express";
import { env } from "../../config/env";
import { hashSessionToken } from "./auth.crypto";
import { getSessionTokenFromRequest } from "./auth.cookies";
import {
  deleteExpiredSessions,
  deleteSessionByTokenHash,
  findSessionByTokenHash,
  updateSessionLastUsed,
} from "./auth.repository";
import type { AuthSessionContext } from "./auth.types";

export function getSessionExpiresAt(from = new Date()) {
  return new Date(from.getTime() + env.authSessionTtlDays * 24 * 60 * 60 * 1000);
}

export async function resolveAuthSession(
  request: Request,
): Promise<AuthSessionContext | null> {
  const token = getSessionTokenFromRequest(request);

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const session = await findSessionByTokenHash(tokenHash);

  if (!session) {
    return null;
  }

  const now = new Date();

  if (session.expiresAt <= now) {
    await deleteSessionByTokenHash(tokenHash);
    return null;
  }

  if (!session.user.isActive) {
    return null;
  }

  await updateSessionLastUsed(session.id, now);

  return {
    sessionId: session.id,
    user: session.user,
    expiresAt: session.expiresAt,
  };
}

export async function cleanupExpiredSessions() {
  await deleteExpiredSessions(new Date());
}
