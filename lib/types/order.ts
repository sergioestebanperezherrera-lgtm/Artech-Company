import type { CartItem } from "./cart";

export type Order = {
  id: string;
  userId: string;
  items: CartItem[];
  status: string;
  createdAt: string;
};
