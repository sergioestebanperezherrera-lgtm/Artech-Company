import type { Prisma } from "@prisma/client";

export const authUserInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

export type AuthUserRecord = Prisma.UserGetPayload<{
  include: typeof authUserInclude;
}>;

export type PublicAuthResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
  };
  roles: string[];
  permissions: string[];
};

export type AuthSessionContext = {
  sessionId: string;
  user: AuthUserRecord;
  expiresAt: Date;
};
