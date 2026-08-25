import { z } from "zod";
import { AppError } from "../../errors/app-error";

const identifierSchema = z.string().trim().min(1).max(64);
const moneySchema = z
  .union([z.number().finite(), z.string().trim()])
  .transform((value) => String(value))
  .refine(
    (value) => /^\d{1,10}(?:\.\d{1,2})?$/.test(value),
    "Amount must be a non-negative monetary value with at most 2 decimals.",
  );

export const cashSessionParamsSchema = z.object({ id: identifierSchema });

export const createCashRegisterSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Cash register code is required.")
    .max(32, "Cash register code is too long.")
    .regex(/^[A-Za-z0-9_-]+$/, "Cash register code has invalid characters."),
  name: z
    .string()
    .trim()
    .min(1, "Cash register name is required.")
    .max(100, "Cash register name is too long."),
});

export const openCashSessionSchema = z.object({
  cashRegisterId: identifierSchema,
  openingAmount: moneySchema,
});

export const createCashMovementSchema = z.object({
  type: z.enum(["CASH_IN", "CASH_OUT"]),
  amount: moneySchema.refine((value) => Number(value) > 0, "Amount must be greater than zero."),
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required.")
    .max(500, "Reason is too long."),
});

export const closeCashSessionSchema = z.object({
  actualClosingAmount: moneySchema,
});

export type CreateCashRegisterInput = z.infer<typeof createCashRegisterSchema>;
export type OpenCashSessionInput = z.infer<typeof openCashSessionSchema>;
export type CreateCashMovementInput = z.infer<typeof createCashMovementSchema>;
export type CloseCashSessionInput = z.infer<typeof closeCashSessionSchema>;

export function parseRequest<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError(result.error.issues[0]?.message ?? "Invalid request.", 400);
  }

  return result.data;
}
