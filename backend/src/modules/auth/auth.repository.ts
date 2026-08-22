import { prisma } from "../../config/prisma";
import { authUserInclude } from "./auth.types";
import { AuthProvider } from "@prisma/client";

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

export async function createGoogleUser(input: {
  name: string;
  email: string;
  googleSub: string;
}) {
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: null,
      emailVerified: true,
      isActive: true,
      authAccounts: {
        create: {
          provider: AuthProvider.GOOGLE,
          providerAccountId: input.googleSub,
        },
      },
    },
    include: authUserInclude,
  });
}

export async function findGoogleAuthAccount(providerAccountId: string) {
  return prisma.authAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: AuthProvider.GOOGLE,
        providerAccountId,
      },
    },
    include: {
      user: {
        include: authUserInclude,
      },
    },
  });
}

export async function linkGoogleAuthAccount(input: {
  userId: string;
  googleSub: string;
}) {
  await prisma.authAccount.create({
    data: {
      userId: input.userId,
      provider: AuthProvider.GOOGLE,
      providerAccountId: input.googleSub,
    },
  });

  return prisma.user.update({
    where: {
      id: input.userId,
    },
    data: {
      emailVerified: true,
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
