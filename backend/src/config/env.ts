import dotenv from "dotenv";

dotenv.config();

function parsePort(value: string | undefined) {
  const parsed = Number(value ?? 4000);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("PORT must be a positive integer.");
  }

  return parsed;
}

function parseCorsOrigins(value: string | undefined) {
  if (!value) {
    return ["http://localhost:3000", "http://127.0.0.1:3000"];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
) {
  const parsed = Number(value ?? fallback);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function parseNonNegativeInteger(
  value: string | undefined,
  fallback: number,
  name: string,
) {
  const parsed = Number(value ?? fallback);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return parsed;
}

function parseTimeZone(value: string | undefined) {
  const timeZone = value?.trim() || "America/Guatemala";

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    throw new Error("BUSINESS_TIME_ZONE must be a valid IANA time zone.");
  }

  return timeZone;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL,
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  authCookieName: process.env.AUTH_COOKIE_NAME ?? "artech_session",
  authSessionTtlDays: parsePositiveInteger(
    process.env.AUTH_SESSION_TTL_DAYS,
    14,
    "AUTH_SESSION_TTL_DAYS",
  ),
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI ??
    "http://localhost:4000/api/auth/google/callback",
  businessTimeZone: parseTimeZone(process.env.BUSINESS_TIME_ZONE),
  earlyClockInMinutes: parseNonNegativeInteger(
    process.env.EARLY_CLOCK_IN_MINUTES,
    30,
    "EARLY_CLOCK_IN_MINUTES",
  ),
};
