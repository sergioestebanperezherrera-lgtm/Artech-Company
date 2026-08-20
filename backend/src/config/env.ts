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

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL,
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
};
