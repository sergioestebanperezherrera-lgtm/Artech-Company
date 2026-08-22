import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { argon2Verify, argon2id } from "hash-wasm";

const passwordHashOptions = {
  memorySize: 19456,
  iterations: 2,
  parallelism: 1,
  hashLength: 32,
};

export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function generateOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function hashOAuthState(state: string) {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

export function safeCompare(value: string, expected: string) {
  const valueBuffer = Buffer.from(value, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(valueBuffer, expectedBuffer);
}

export function hashPassword(password: string) {
  return argon2id({
    password,
    salt: randomBytes(16),
    outputType: "encoded",
    ...passwordHashOptions,
  });
}

export function verifyPassword(passwordHash: string, password: string) {
  return argon2Verify({
    password,
    hash: passwordHash,
  });
}
