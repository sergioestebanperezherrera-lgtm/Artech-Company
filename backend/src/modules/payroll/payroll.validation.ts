import { z } from "zod";
import { AppError } from "../../errors/app-error";

const identifierSchema = z.string().trim().min(1).max(64);

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Date is invalid.");

export const createPayrollPeriodSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(120, "Name is too long."),
    startDate: dateSchema,
    endDate: dateSchema,
  })
  .refine((input) => input.startDate <= input.endDate, {
    message: "startDate must be on or before endDate.",
  });

export const payrollPeriodParamsSchema = z.object({ id: identifierSchema });

export const adjustPayrollSlipSchema = z.object({
  adjustmentsAmount: z
    .union([z.number().finite(), z.string().trim()])
    .transform((value) => String(value))
    .refine(
      (value) => /^-?\d{1,7}(?:\.\d{1,2})?$/.test(value),
      "Adjustment must be a monetary value with at most 2 decimals.",
    )
    .refine(
      (value) => Math.abs(Number(value)) <= 1000000,
      "Adjustment is too large.",
    ),
  adjustmentReason: z
    .string()
    .trim()
    .min(1, "Adjustment reason is required.")
    .max(500, "Reason is too long."),
});

export type CreatePayrollPeriodInput = z.infer<typeof createPayrollPeriodSchema>;
export type AdjustPayrollSlipInput = z.infer<typeof adjustPayrollSlipSchema>;

export function parseRequest<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError(result.error.issues[0]?.message ?? "Invalid request.", 400);
  }

  return result.data;
}
