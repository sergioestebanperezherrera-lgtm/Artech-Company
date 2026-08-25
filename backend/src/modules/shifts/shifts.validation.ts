import { z } from "zod";
import { AppError } from "../../errors/app-error";

export const shiftTypes = ["DAY", "EVENING", "NIGHT"] as const;
export const weekdays = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

const identifierSchema = z
  .string()
  .trim()
  .min(1, "Identifier is required.")
  .max(64, "Identifier is too long.");

const requiredNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(100, "Name is too long.");

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, "Code is required.")
  .max(32, "Code is too long.")
  .regex(/^[A-Z0-9][A-Z0-9_-]*$/, "Code contains invalid characters.");

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm format.");

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Date is invalid.");

const workDaysSchema = z
  .array(z.enum(weekdays))
  .min(1, "At least one work day is required.")
  .max(7, "Too many work days.")
  .refine((days) => new Set(days).size === days.length, {
    message: "Work days cannot be duplicated.",
  });

export const shiftIdParamsSchema = z.object({
  id: identifierSchema,
});

export const employeeShiftParamsSchema = z.object({
  employeeId: identifierSchema,
});

export const createShiftSchema = z.object({
  name: requiredNameSchema,
  code: codeSchema,
  type: z.enum(shiftTypes),
  startTime: timeSchema,
  endTime: timeSchema,
  workDays: workDaysSchema,
});

export const updateShiftSchema = z
  .object({
    name: requiredNameSchema.optional(),
    code: codeSchema.optional(),
    type: z.enum(shiftTypes).optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    workDays: workDaysSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one shift field is required.",
  });

export const createShiftAssignmentSchema = z.object({
  shiftId: identifierSchema,
  effectiveFrom: dateSchema,
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type CreateShiftAssignmentInput = z.infer<
  typeof createShiftAssignmentSchema
>;

export function parseRequest<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError(result.error.issues[0]?.message ?? "Invalid request.", 400);
  }

  return result.data;
}
