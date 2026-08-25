import type { Product } from "./product";

export type CashMovementType = "CASH_IN" | "CASH_OUT" | "SALE";
export type CashSessionStatus = "OPEN" | "CLOSED";
export type PosPaymentMethod = "CASH" | "CARD";

export type CashRegister = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CashSessionMovement = {
  id: string;
  type: CashMovementType;
  amount: number;
  reason: string | null;
  sale: { id: string; saleNumber: string } | null;
  createdBy: { id: string; name: string; email: string };
  createdAt: string;
};

export type CashSessionSaleSummary = {
  id: string;
  saleNumber: string;
  status: string;
  total: number;
  createdAt: string;
};

export type CashSession = {
  id: string;
  status: CashSessionStatus;
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  expectedClosingAmount: number;
  actualClosingAmount: number;
  differenceAmount: number;
  cashRegister: CashRegister;
  employment: {
    id: string;
    employee: {
      id: string;
      code: string;
      firstName: string;
      lastName: string;
    };
  };
  openedBy: { id: string; name: string; email: string };
  closedBy: { id: string; name: string; email: string } | null;
  movements: CashSessionMovement[];
  sales: CashSessionSaleSummary[];
  createdAt: string;
  updatedAt: string;
};

export type OpenCashSessionInput = {
  cashRegisterId: string;
  openingAmount: string;
};

export type CreateCashRegisterInput = {
  code: string;
  name: string;
};

export type CreateCashMovementInput = {
  type: "CASH_IN" | "CASH_OUT";
  amount: string;
  reason: string;
};

export type CloseCashSessionInput = {
  actualClosingAmount: string;
};

export type PosSaleItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PosPayment = {
  id: string;
  method: PosPaymentMethod;
  status: string;
  amount: number;
  changeAmount: number;
  externalReference: string | null;
  createdAt: string;
};

export type PosSale = {
  id: string;
  saleNumber: string;
  channel: "POS";
  status: string;
  cashSession: {
    id: string;
    status: CashSessionStatus;
    cashRegister: Pick<CashRegister, "id" | "code" | "name">;
  } | null;
  employee: {
    id: string;
    code: string;
    firstName: string;
    lastName: string;
  };
  items: PosSaleItem[];
  payment: PosPayment | null;
  subtotal: number;
  discount: number;
  total: number;
  clientRequestId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePosSaleInput = {
  cashSessionId: string;
  items: Array<{ productId: string; quantity: number }>;
  payment: {
    method: PosPaymentMethod;
    amount: string;
  };
  clientRequestId: string;
};

export type PosCartItem = {
  product: Product;
  quantity: number;
};
