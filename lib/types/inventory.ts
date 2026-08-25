export type InventoryStockStatus = "AVAILABLE" | "LOW" | "OUT";

export type InventoryMovementType =
  | "PURCHASE"
  | "SALE"
  | "RETURN"
  | "ADJUSTMENT"
  | "DAMAGE";

export type InventoryMovementDirection = "IN" | "OUT";

export type InventoryItem = {
  productId: string;
  name: string;
  sku: string;
  isActive: boolean;
  category: { id: string; name: string } | null;
  hasInventoryRecord: boolean;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  stockStatus: InventoryStockStatus;
  updatedAt: string | null;
};

export type InventoryFilters = {
  search?: string;
  stockStatus?: "all" | "available" | "low" | "out";
};

export type InventoryMovement = {
  id: string;
  product: { id: string; name: string; sku: string };
  type: InventoryMovementType;
  direction: InventoryMovementDirection;
  quantity: number;
  reference: string | null;
  note: string | null;
  sale: {
    id: string;
    saleNumber: string;
    channel: string;
  } | null;
  createdBy: { id: string; name: string; email: string } | null;
  occurredAt: string;
};

export type InventoryMovementFilters = {
  productId?: string;
  type?: InventoryMovementType;
  limit?: number;
};

export type CreateInventoryMovementInput = {
  productId: string;
  type: Exclude<InventoryMovementType, "SALE">;
  quantity: number;
  reason: string;
};
