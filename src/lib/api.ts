import type {
  AuthResponse,
  Currency,
  DashboardStats,
  LowStockItem,
  NewSale,
  Product,
  ProductFilters,
  RefundInput,
  Sale,
  User,
} from "@/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("luxe_pos_token") : null;
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function qs(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  // Auth
  login: (username: string, password: string): Promise<AuthResponse> =>
    http("POST", "/auth/login", { username, password }),
  getMe: (): Promise<{ user: User }> => http("GET", "/auth/me"),
  listUsers: (): Promise<User[]> => http("GET", "/users"),
  createUser: (user: Partial<User> & { password?: string }): Promise<{ id: number }> =>
    http("POST", "/users", user),
  updateUser: (id: number, user: Partial<User> & { password?: string }): Promise<void> =>
    http("PUT", `/users/${id}`, user),
  deleteUser: (id: number): Promise<void> => http("DELETE", `/users/${id}`),

  // Products / inventory
  listProducts: (filters?: {
    search?: string;
    category?: string;
    brand?: string;
    size?: string;
    color?: string;
    inStockOnly?: boolean;
  }): Promise<Product[]> =>
    http("GET", `/products${qs(filters || {})}`),
  getProductFilters: (): Promise<ProductFilters> => http("GET", "/products/filters"),
  getProduct: (id: number): Promise<Product | null> => http("GET", `/products/${id}`),
  createProduct: (product: Product): Promise<number> => http("POST", "/products", product),
  updateProduct: (product: Product): Promise<void> => http("PUT", `/products/${product.id}`, product),
  deleteProduct: (id: number): Promise<void> => http("DELETE", `/products/${id}`),
  adjustStock: (id: number, delta: number): Promise<void> =>
    http("POST", `/products/${id}/adjust-stock`, { delta }),
  listCategories: (): Promise<string[]> => http("GET", "/categories"),
  createCategory: (name: string): Promise<void> => http("POST", "/categories", { name }),
  lowStockProducts: (): Promise<LowStockItem[]> => http("GET", "/products/low-stock"),

  // Sales / POS / Refunds
  createSale: (sale: NewSale): Promise<Sale> => http("POST", "/sales", sale),
  listSales: (
    from?: string,
    to?: string,
    search?: string,
    paymentMethod?: string,
    status?: string
  ): Promise<Sale[]> =>
    http("GET", `/sales${qs({ from, to, search, paymentMethod, status })}`),
  voidSale: (id: number): Promise<void> => http("POST", `/sales/${id}/void`),
  refundSale: (
    id: number,
    input: RefundInput
  ): Promise<{ ok: boolean; refund_no: string; sale_status: string; refund_amount: number }> =>
    http("POST", `/sales/${id}/refund`, input),

  // Currencies
  listCurrencies: (): Promise<Currency[]> => http("GET", "/currencies"),
  upsertCurrency: (currency: Currency): Promise<void> =>
    http("PUT", `/currencies/${currency.code}`, currency),
  deleteCurrency: (code: string): Promise<void> => http("DELETE", `/currencies/${code}`),
  setBaseCurrency: (code: string): Promise<void> => http("POST", `/currencies/${code}/set-base`),

  // Settings
  getSettings: (): Promise<Record<string, string>> => http("GET", "/settings"),
  updateSetting: (key: string, value: string): Promise<void> =>
    http("PUT", `/settings/${key}`, { value }),

  // Dashboard
  dashboardStats: (): Promise<DashboardStats> => http("GET", "/dashboard/stats"),
};
