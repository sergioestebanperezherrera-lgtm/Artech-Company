import { z } from "zod";
import { AppError } from "../../errors/app-error";

const identifierSchema = z.string().trim().min(1).max(64);
const moneySchema = z
  .union([z.number().finite(), z.string().trim()])
  .transform((value) => String(value))
  .refine(
    (value) => /^\d{1,10}(?:\.\d{1,2})?$/.test(value),
    "Payment amount must have at most 2 decimals.",
  );

export const posSaleParamsSchema = z.object({ id: identifierSchema });

export const posSaleListQuerySchema = z.object({
  cashSessionId: identifierSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createPosSaleSchema = z
  .object({
    cashSessionId: identifierSchema,
    items: z
      .array(
        z.object({
          productId: identifierSchema,
          quantity: z.number().int().min(1).max(10_000),
        }),
      )
      .min(1, "At least one product is required.")
      .max(100, "Too many sale items."),
    payment: z.object({
      method: z.enum(["CASH", "CARD"]),
      amount: moneySchema.refine(
        (value) => Number(value) > 0,
        "Payment amount must be greater than zero.",
      ),
    }),
    clientRequestId: z.string().uuid().optional(),
  })
  .superRefine((input, context) => {
    const productIds = new Set<string>();

    input.items.forEach((item, index) => {
      if (productIds.has(item.productId)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "productId"],
          message: "Duplicate products are not allowed.",
        });
      }
      productIds.add(item.productId);
    });
  });

export type PosSaleListQuery = z.infer<typeof posSaleListQuerySchema>;
export type CreatePosSaleInput = z.infer<typeof createPosSaleSchema>;

export function parseRequest<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError(result.error.issues[0]?.message ?? "Invalid request.", 400);
  }

  return result.data;
}
