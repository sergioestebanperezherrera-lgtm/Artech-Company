import { brands } from "@/lib/data/brands";
import type { Brand } from "@/lib/types";

export const brandService = {
  getAll(): Brand[] {
    return brands;
  },
};
