import { z } from "zod";
import { AppError } from "../../errors/app-error";

const identifierSchema = z
  .string()
  .trim()
  .min(1, "Identifier is required.")
  .max(64, "Identifier is too long.");

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Date is invalid.");

const amountSchema = z
  .union([z.number(), z.string().trim()])
  .transform((value) => String(value))
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), {
    message: "Amount must be a positive monetary value with up to 2 decimals.",
  })
  .refine((value) => Number(value) > 0, {
    message: "Amount must be greater than zero.",
  });

export const employeeCompensationParamsSchema = z.object({
  employeeId: identifierSchema,
});

export const createCompensationPeriodSchema = z.object({
  amount: amountSchema,
  currency: z.enum(["GTQ"]),
  payFrequency: z.enum(["MONTHLY", "BIWEEKLY"]),
  effectiveFrom: dateSchema,
});

export type CreateCompensationPeriodInput = z.infer<
  typeof createCompensationPeriodSchema
>;

export function parseRequest<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError(result.error.issues[0]?.message ?? "Invalid request.", 400);
  }

  return result.data;
}
