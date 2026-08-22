import { prisma } from "../../config/prisma";
import { authUserInclude } from "./auth.types";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email,
    },
    include: authUserInclude,
  });
}

export async function createLocalUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
    },
    include: authUserInclude,
  });
}

export async function createSession(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.session.create({
    data: input,
  });
}

export async function findSessionByTokenHash(tokenHash: string) {
  return prisma.session.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: {
        include: authUserInclude,
      },
    },
  });
}

export async function updateSessionLastUsed(sessionId: string, lastUsedAt: Date) {
  return prisma.session.update({
    where: {
      id: sessionId,
    },
    data: {
      lastUsedAt,
    },
  });
}

export async function deleteSessionByTokenHash(tokenHash: string) {
  return prisma.session.deleteMany({
    where: {
      tokenHash,
    },
  });
}

export async function deleteExpiredSessions(now: Date) {
  return prisma.session.deleteMany({
    where: {
      expiresAt: {
        lte: now,
      },
    },
  });
}
