import { z } from "zod";
import { AppError } from "../../errors/app-error";

export const attendanceStatuses = ["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const;

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

const dateTimeSchema = z
  .string()
  .datetime({ offset: true, message: "Date-time must be a valid ISO value." });

const optionalTextSchema = z
  .string()
  .trim()
  .max(500, "Text is too long.")
  .optional();

const requiredReasonSchema = z
  .string()
  .trim()
  .min(1, "Adjustment reason is required.")
  .max(500, "Adjustment reason is too long.");

export const attendanceIdParamsSchema = z.object({
  id: identifierSchema,
});

export const employeeAttendanceParamsSchema = z.object({
  employeeId: identifierSchema,
});

export const attendanceListQuerySchema = z.object({
  date: dateSchema.optional(),
  employeeId: identifierSchema.optional(),
  status: z.enum(attendanceStatuses).optional(),
});

export const clockInSchema = z.object({
  employeeId: identifierSchema,
  workDate: dateSchema.optional(),
});

export const clockOutSchema = z.object({
  employeeId: identifierSchema,
  workDate: dateSchema.optional(),
});

export const overrideAttendanceSchema = z
  .object({
    clockInAt: dateTimeSchema.nullable().optional(),
    clockOutAt: dateTimeSchema.nullable().optional(),
    status: z.enum(attendanceStatuses).optional(),
    notes: optionalTextSchema.nullable(),
    adjustmentReason: requiredReasonSchema,
  })
  .refine(
    (input) =>
      input.clockInAt !== undefined ||
      input.clockOutAt !== undefined ||
      input.status !== undefined ||
      input.notes !== undefined,
    {
      message: "At least one attendance field is required.",
    },
  );

export type AttendanceListQuery = z.infer<typeof attendanceListQuerySchema>;
export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type OverrideAttendanceInput = z.infer<typeof overrideAttendanceSchema>;

export function parseRequest<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError(result.error.issues[0]?.message ?? "Invalid request.", 400);
  }

  return result.data;
}
