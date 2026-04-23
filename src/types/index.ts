export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string | null;
  categoryId: string;
  isAvailable: boolean;
  options?: MenuItemOption[];
  customizationGroups?: MenuItemOption[];
}

export interface MenuItemOption {
  id: string;
  name: string;
  minSelect?: number;
  maxSelect?: number;
  choices: MenuItemOptionChoice[];
}

export interface MenuItemOptionChoice {
  id: string;
  label: string;
  priceAdjustment: number;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note?: string;
  selectedOptions?: Record<string, string>;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";

export type OrderItemStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";

export interface CreateOrderPayload {
  tableCode: string;
  items: {
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    price: number;
    note?: string;
    selectedOptions?: Record<string, string>;
  }[];
}

/** Chi "drink" | "snack" — dung dung chu thuong (wire submit-cart). */
export type FnbCategory = "drink" | "snack";

export type FNBOrderSelection = {
  groupKey: string;
  optionKey: string;
};

export type FNBOrderLine = {
  itemId: string;
  category: FnbCategory;
  /** So nguyen >= 1 */
  quantity: number;
  /** Chi state local / debug; server submit-cart gan id moi. */
  lineId?: string;
  note?: string;
  selections?: FNBOrderSelection[];
};

export type FNBOrder = {
  lines: FNBOrderLine[];
};

export type SubmitCoffeeSessionCartPayload = {
  cart: FNBOrder;
};

export type CartSelection = FNBOrderSelection;
export type CoffeeSubmitCartLine = FNBOrderLine;

/** Ten ngan gon (bang nghia CoffeeSubmitCartLine). */
export type CartLine = CoffeeSubmitCartLine;

/**
 * Body POST /client/coffee-session-orders/me/submit-cart.
 * - Co lines: nen gui kem drinks + snacks (object, co the {}).
 * - Legacy: chi drinks + snacks, khong gui lines hoac lines rong.
 */
export interface CoffeeSessionSubmitCartRequest {
  cart: {
    lines?: CoffeeSubmitCartLine[];
    drinks?: Record<string, number>;
    snacks?: Record<string, number>;
  };
}

/** Gia tri `order.order` trong GET /client/coffee-sessions/me. */
export interface CoffeeSessionMeOrderPayload {
  drinks: Record<string, number>;
  snacks: Record<string, number>;
}

/**
 * Mot dong tren document order coffee-session (gia niem yet vs gia thu thuc).
 * Drinks trong ve co the charged = 0, snack van tinh tien.
 */
export interface CoffeeSessionOrderLineItem {
  /** Id mon menu (wire — ten field co the doi, parser ho tro alias). */
  menuItemId?: string;
  itemId?: string;
  name?: string;
  note?: string;
  quantity: number;
  /** Gia niem yet / don vi (hien gach ngang neu khac charged). */
  listUnitPrice: number;
  /** quantity × listUnitPrice */
  lineListTotal: number;
  /** Gia thuc te / don vi khach tra. */
  chargedUnitPrice: number;
  lineChargedTotal: number;
  selections?: FNBOrderSelection[];
}

/** Document order gan voi session (wire API). */
export interface CoffeeSessionOrderDocument {
  _id: string;
  coffeeSessionId: string;
  order: CoffeeSessionMeOrderPayload;
  /** Chi tiet gia tung dong (uu tien cho UI). */
  lineItems?: CoffeeSessionOrderLineItem[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  history: unknown[];
}

export interface CoffeeSessionPlanSnapshot {
  pricePerPerson: number;
  peopleCount: number;
  totalPrice: number;
  currency: string;
}

export interface CoffeeSessionResult {
  _id: string;
  tableId: string;
  status: string;
  scheduledStartTime: string;
  expectedDurationMinutes: number;
  startTime: string;
  endTime: string | null;
  usageDurationMinutes: number | null;
  peopleCount: number;
  note: string | null;
  planSnapshot: CoffeeSessionPlanSnapshot;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  completedBy: string | null;
  order?: CoffeeSessionOrderDocument | null;
}

/** GET /client/coffee-sessions/me — body thanh cong. */
export interface CoffeeSessionsMeResponse {
  message: string;
  result: CoffeeSessionResult;
}
