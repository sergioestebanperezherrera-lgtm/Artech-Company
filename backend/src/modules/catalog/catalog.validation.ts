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

const optionalMoneySchema = z.union([moneySchema, z.null()]).optional();

const imagePathSchema = z
  .string()
  .trim()
  .min(1, "Image path is required.")
  .max(500, "Image path is too long.")
  .refine(
    (value) => value.startsWith("/") || /^https?:\/\/\S+$/.test(value),
    "Image must be an absolute path starting with / or an http(s) URL.",
  );

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug can only contain lowercase letters, numbers and hyphens.",
  )
  .max(120, "Slug is too long.");

export const productSlugParamsSchema = z.object({ id: identifierSchema });

const specificationsSchema = z
  .array(
    z.object({
      label: z.string().trim().min(1, "Specification label is required.").max(80),
      value: z.string().trim().min(1, "Specification value is required.").max(200),
      isHighlighted: z.boolean().default(false),
    }),
  )
  .max(30, "Too many specifications.")
  .optional();

export const adminCreateProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(150, "Name is too long."),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "SKU is too short.")
    .max(64, "SKU is too long.")
    .regex(/^[A-Z0-9_-]+$/, "SKU can only contain letters, numbers, dashes and underscores."),
  slug: slugSchema.optional(),
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(3000, "Description is too long."),
  price: moneySchema,
  previousPrice: optionalMoneySchema,
  categoryId: identifierSchema,
  brandId: identifierSchema.nullable().optional(),
  barcode: z.string().trim().max(64, "Barcode is too long.").nullable().optional(),
  hasRgbLighting: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  images: z.array(imagePathSchema).max(8, "At most 8 images.").default([]),
  specifications: specificationsSchema,
});

export const adminUpdateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(64)
      .regex(/^[A-Z0-9_-]+$/)
      .optional(),
    slug: slugSchema.optional(),
    description: z.string().trim().min(1).max(3000).optional(),
    price: moneySchema.optional(),
    previousPrice: optionalMoneySchema,
    categoryId: identifierSchema.optional(),
    brandId: identifierSchema.nullable().optional(),
    barcode: z.string().trim().max(64).nullable().optional(),
    hasRgbLighting: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    images: z.array(imagePathSchema).max(8).optional(),
    specifications: specificationsSchema,
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one product field is required.",
  });

export const adminProductListQuerySchema = z.object({
  search: z.string().trim().max(120, "Search is too long.").optional(),
  categoryId: identifierSchema.optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
});

export const adminCreateCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100, "Name is too long."),
  description: z.string().trim().max(500, "Description is too long.").optional(),
  icon: z.string().trim().max(80, "Icon is too long.").optional(),
});

export const adminUpdateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    icon: z.string().trim().max(80).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one category field is required.",
  });

export type AdminCreateProductInput = z.infer<typeof adminCreateProductSchema>;
export type AdminUpdateProductInput = z.infer<typeof adminUpdateProductSchema>;
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;
export type AdminCreateCategoryInput = z.infer<typeof adminCreateCategorySchema>;
export type AdminUpdateCategoryInput = z.infer<typeof adminUpdateCategorySchema>;

export function parseRequest<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError(result.error.issues[0]?.message ?? "Invalid request.", 400);
  }

  return result.data;
}
