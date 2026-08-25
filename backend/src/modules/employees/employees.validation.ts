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

const requiredNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(100, "Name is too long.");

const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email must be valid.")
  .max(254, "Email is too long.");

const optionalPhoneSchema = z
  .string()
  .trim()
  .min(7, "Phone is too short.")
  .max(30, "Phone is too long.")
  .regex(/^[0-9+().\-\s]+$/, "Phone contains invalid characters.");

const optionalNotesSchema = z
  .string()
  .trim()
  .min(1, "Notes cannot be empty.")
  .max(500, "Notes are too long.");

export const positionIdParamsSchema = z.object({
  id: identifierSchema,
});

export const employeeIdParamsSchema = positionIdParamsSchema;

export const createPositionSchema = z.object({
  name: requiredNameSchema,
  description: z.string().trim().max(300, "Description is too long.").optional(),
});

export const updatePositionSchema = z
  .object({
    name: requiredNameSchema.optional(),
    description: z
      .union([
        z.string().trim().min(1, "Description cannot be empty.").max(300),
        z.null(),
      ])
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one position field is required.",
  });

export const employeeListQuerySchema = z.object({
  status: z.enum(["all", "active", "inactive"]).default("all"),
  positionId: identifierSchema.optional(),
  search: z.string().trim().max(120, "Search is too long.").optional(),
});

export const createEmployeeSchema = z.object({
  firstName: requiredNameSchema,
  lastName: requiredNameSchema,
  email: optionalEmailSchema.optional(),
  phone: optionalPhoneSchema.optional(),
  positionId: identifierSchema,
  startDate: dateSchema,
});

export const updateEmployeeSchema = z
  .object({
    firstName: requiredNameSchema.optional(),
    lastName: requiredNameSchema.optional(),
    email: z.union([optionalEmailSchema, z.null()]).optional(),
    phone: z.union([optionalPhoneSchema, z.null()]).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one employee field is required.",
  });

export const changePositionSchema = z.object({
  positionId: identifierSchema,
  startDate: dateSchema,
  notes: optionalNotesSchema.optional(),
});

export const terminateEmployeeSchema = z.object({
  endDate: dateSchema,
  notes: optionalNotesSchema.optional(),
});

export const reactivateEmployeeSchema = z.object({
  positionId: identifierSchema,
  startDate: dateSchema,
  notes: optionalNotesSchema.optional(),
});

export type CreatePositionInput = z.infer<typeof createPositionSchema>;
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type ChangePositionInput = z.infer<typeof changePositionSchema>;
export type TerminateEmployeeInput = z.infer<typeof terminateEmployeeSchema>;
export type ReactivateEmployeeInput = z.infer<typeof reactivateEmployeeSchema>;

export function parseRequest<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError(result.error.issues[0]?.message ?? "Invalid request.", 400);
  }

  return result.data;
}
