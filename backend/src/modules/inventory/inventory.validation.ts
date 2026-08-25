import { z } from "zod";
import { AppError } from "../../errors/app-error";

const identifierSchema = z.string().trim().min(1).max(64);

const quantitySchema = z
  .union([z.number().finite().int(), z.string().trim()])
  .transform((value) => Number(value))
  .refine(
    (value) => Number.isInteger(value) && value > 0,
    "Quantity must be a positive whole number.",
  )
  .refine(
    (value) => value <= 1000000,
    "Quantity is too large.",
  );

export const inventoryListQuerySchema = z.object({
  search: z.string().trim().max(120, "Search is too long.").optional(),
  stockStatus: z.enum(["all", "available", "low", "out"]).default("all"),
});

export const movementListQuerySchema = z.object({
  productId: identifierSchema.optional(),
  type: z.enum(["PURCHASE", "SALE", "RETURN", "ADJUSTMENT", "DAMAGE"]).optional(),
  limit: z
    .union([z.number().finite().int(), z.string().trim()])
    .transform((value) => Number(value))
    .refine((value) => Number.isInteger(value) && value > 0 && value <= 200, {
      message: "Limit must be between 1 and 200.",
    })
    .default(50),
});

export const createManualMovementSchema = z.object({
  productId: identifierSchema,
  type: z.enum(["PURCHASE", "RETURN", "ADJUSTMENT", "DAMAGE"], {
    message: "Movement type is not valid for manual adjustments.",
  }),
  quantity: quantitySchema,
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required.")
    .max(500, "Reason is too long."),
});

export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;
export type MovementListQuery = z.infer<typeof movementListQuerySchema>;
export type CreateManualMovementInput = z.infer<typeof createManualMovementSchema>;

export function parseRequest<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError(result.error.issues[0]?.message ?? "Invalid request.", 400);
  }

  return result.data;
}
