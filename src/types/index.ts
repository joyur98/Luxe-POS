export interface User {
  id: number;
  username: string;
  full_name: string;
  role: "admin" | "manager" | "cashier";
  is_active?: boolean;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Product {
  id: number | null;
  sku: string;
  name: string;
  category: string | null;
  brand: string | null;
  size: string | null;
  color: string | null;
  material: string | null;
  cost_price: number;
  sale_price: number;
  quantity: number;
  reorder_level: number;
  image_path: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductFilters {
  categories: string[];
  brands: string[];
  sizes: string[];
  colors: string[];
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_base: boolean;
}

export interface SaleItemInput {
  product_id: number;
  product_name: string;
  sku: string;
  unit_price: number;
  quantity: number;
  discount: number;
}

export interface SaleItem extends SaleItemInput {
  id: number;
  sale_id: number;
  unit_cost: number;
  line_total: number;
}

export interface NewSale {
  customer_name: string | null;
  currency_code: string;
  exchange_rate: number;
  discount: number;
  tax_rate: number;
  payment_method: string;
  notes: string | null;
  items: SaleItemInput[];
}

export interface RefundItem {
  sale_item_id: number;
  product_id?: number | null;
  product_name: string;
  sku: string;
  unit_price: number;
  quantity: number;
  refund_line_total: number;
  restock_inventory: boolean;
}

export interface Refund {
  id: number;
  sale_id: number;
  refund_no: string;
  customer_name: string | null;
  refund_amount: number;
  payment_method: string;
  reason: string | null;
  processed_by: string;
  created_at: string;
  items: RefundItem[];
}

export interface RefundInput {
  items: {
    sale_item_id: number;
    product_id?: number | null;
    quantity: number;
    restock_inventory: boolean;
  }[];
  payment_method?: string;
  reason?: string;
  processed_by?: string;
}

export interface Sale {
  id: number;
  invoice_no: string;
  customer_name: string | null;
  currency_code: string;
  exchange_rate: number;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  payment_method: string;
  status: "completed" | "partially_refunded" | "refunded" | "voided" | string;
  notes: string | null;
  created_at: string;
  items: SaleItem[];
  refunds?: Refund[];
}

export interface DashboardStats {
  today_sales_total: number;
  today_sales_count: number;
  today_profit: number;
  month_sales_total: number;
  month_profit: number;
  total_products: number;
  low_stock_count: number;
  base_currency: string;
}

export interface LowStockItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  reorder_level: number;
}

export const PAYMENT_METHODS = ["Cash", "Card", "eSewa", "Khalti", "Bank Transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
