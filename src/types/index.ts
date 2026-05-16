import type {
  Role,
  RecipeCategory,
  IngredientCategory,
  Unit,
  TableStatus,
  OrderStatus,
  OrderItemStatus,
  PaymentMethod,
  FohCategory,
  StockTxType,
  StockItemType,
  PoStatus,
  LabMessageRole,
  LabRecipeStatus,
  OrderType,
  ReservationStatus,
  PrepTaskType,
  PrepStatus,
} from "@prisma/client";

export type {
  Role,
  RecipeCategory,
  IngredientCategory,
  Unit,
  TableStatus,
  OrderStatus,
  OrderItemStatus,
  PaymentMethod,
  FohCategory,
  StockTxType,
  StockItemType,
  PoStatus,
  LabMessageRole,
  LabRecipeStatus,
  OrderType,
  ReservationStatus,
  PrepTaskType,
  PrepStatus,
};

export interface RecipeWithDetails {
  id: string;
  name: string;
  category: RecipeCategory;
  description: string | null;
  method: string | null;
  prepTime: number;
  cookTime: number;
  servings: number;
  sellingPrice: number;
  imageUrl: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; name: string };
  ingredients: {
    id: string;
    quantity: number;
    unit: Unit;
    ingredient: {
      id: string;
      name: string;
      costPerUnit: number;
      unit: Unit;
    };
  }[];
  allergens: {
    allergen: { id: string; name: string };
  }[];
  costPerServing?: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: Role[];
}

export interface TableWithOrder {
  id: string;
  number: number;
  section: string;
  capacity: number;
  status: TableStatus;
  orders: { id: string; status: OrderStatus; openedAt: Date }[];
}

export interface MenuItemWithRecipe {
  id: string;
  name: string;
  price: number;
  category: RecipeCategory;
  subcategory: string | null;
  available: boolean;
  imageUrl: string | null;
  sortOrder: number;
  recipeId: string | null;
  allergenNames: string[];
  dietaryTags: string[];
  recipe: { id: string; name: string; sellingPrice: number } | null;
}

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string | null;
  dietaryTags: string[];
  allergenTags: string[];
  notes: string | null;
  visitCount: number;
}

export interface CustomerWithSuggestions extends CustomerProfile {
  topItems: {
    id: string;
    name: string;
    price: number;
    category: RecipeCategory;
    count: number;
  }[];
}

export interface OrderItemDetail {
  id: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
  specialRequests: string[];
  courseNumber: number;
  isSharing: boolean;
  status: OrderItemStatus;
  voidReason: string | null;
  menuItem: { id: string; name: string; category: RecipeCategory };
}

export interface OrderWithItems {
  id: string;
  type: OrderType;
  tableId: string | null;
  customerId: string | null;
  serverId: string;
  customerName: string | null;
  customerPhone: string | null;
  status: OrderStatus;
  total: number;
  tax: number;
  discount: number;
  serveNote: string | null;
  paymentMethod: PaymentMethod | null;
  openedAt: Date;
  closedAt: Date | null;
  table: { id: string; number: number; section: string } | null;
  customer: CustomerProfile | null;
  server: { id: string; name: string };
  items: OrderItemDetail[];
}

export interface KdsTicket {
  id: string;
  type: OrderType;
  status: string;
  customerName: string | null;
  serveNote: string | null;
  openedAt: Date;
  closedAt: Date | null;
  table: { number: number; section: string } | null;
  server: { name: string };
  items: {
    id: string;
    quantity: number;
    notes: string | null;
    specialRequests: string[];
    courseNumber: number;
    isSharing: boolean;
    status: OrderItemStatus;
    menuItem: { name: string; category: string };
  }[];
}

export interface ReservationRow {
  id: string;
  tableId: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  partySize: number;
  reservedFor: string;
  notes: string | null;
  specialTags: string[];
  dietaryTags: string[];
  allergenTags: string[];
  status: ReservationStatus;
  createdAt: string;
  table: { id: string; number: number; section: string } | null;
  createdBy: { id: string; name: string };
  customer: { id: string; name: string; phone: string | null; dietaryTags: string[]; allergenTags: string[] } | null;
}

export interface StockTransactionRow {
  id: string;
  itemType: StockItemType;
  itemId: string;
  type: StockTxType;
  quantity: number;
  referenceId: string | null;
  notes: string | null;
  createdAt: Date;
  createdBy: { name: string };
  itemName?: string;
}

export interface SupplierWithProducts {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactName: string | null;
  leadDays: number;
  active: boolean;
  createdAt: Date;
  products: {
    id: string;
    unitPrice: number;
    unit: Unit;
    isPreferred: boolean;
    ingredient: { id: string; name: string; unit: Unit };
  }[];
  _count: { purchaseOrders: number };
}

export interface PoLineItemRow {
  id: string;
  poId: string;
  ingredientId: string;
  quantity: number;
  unitPrice: number;
  receivedQty: number | null;
  ingredient: { id: string; name: string; unit: Unit };
}

export interface PurchaseOrderWithDetails {
  id: string;
  supplierId: string;
  status: PoStatus;
  notes: string | null;
  expectedAt: Date | null;
  receivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  supplier: { id: string; name: string; email: string | null };
  createdBy: { id: string; name: string };
  approvedBy: { id: string; name: string } | null;
  lineItems: PoLineItemRow[];
}

export interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  createdAt: Date;
}

export interface AIRecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  costPerUnit?: number;
}

export interface AIRecipeData {
  name: string;
  category: string;
  description: string;
  method: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  suggestedPrice: number;
  estimatedCost: number;
  ingredients: AIRecipeIngredient[];
  allergens: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  platingNotes?: string;
}

export interface LabMessageItem {
  id: string;
  role: LabMessageRole;
  content: string;
  createdAt: Date;
}

export interface LabSessionItem {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { messages: number };
}

export interface LabRecipeRow {
  id: string;
  sessionId: string;
  name: string;
  recipeJson: AIRecipeData;
  status: LabRecipeStatus;
  reviewedById: string | null;
  reviewedAt: Date | null;
  savedRecipeId: string | null;
  createdAt: Date;
  reviewedBy: { id: string; name: string } | null;
}

export interface PrepIngredient {
  id: string;
  name: string;
  unit: Unit;
  currentStock: number;
  parLevel: number;
  batchYield: number | null;
  prepRecipeId: string | null;
  prepRecipe: {
    id: string;
    name: string;
    servings: number;
    ingredients: {
      id: string;
      quantity: number;
      unit: Unit;
      ingredient: { id: string; name: string; unit: Unit; currentStock: number };
    }[];
  } | null;
}

export interface PrepTaskRow {
  id: string;
  ingredientId: string;
  type: PrepTaskType;
  status: PrepStatus;
  targetQty: number;
  notes: string | null;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  ingredient: PrepIngredient;
  createdBy: { id: string; name: string };
}

export interface PrepRoutineRow {
  id: string;
  ingredientId: string;
  targetQty: number;
  daysOfWeek: number[];
  triggerTime: string;
  active: boolean;
  createdAt: string;
  ingredient: { id: string; name: string; unit: Unit; currentStock: number; parLevel: number };
}
