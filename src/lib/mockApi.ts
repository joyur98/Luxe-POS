import type {
  Currency,
  DashboardStats,
  LowStockItem,
  NewSale,
  Product,
  Sale,
} from "@/types";

// Lightweight in-browser stand-in for the Tauri/Rust backend so the UI can
// be previewed with `npm run dev` in an ordinary browser tab. The real
// desktop build always talks to SQLite through src-tauri instead of this file.

const KEY = "luxe-pos-mock-db";

interface DbShape {
  products: Product[];
  currencies: Currency[];
  categories: string[];
  sales: Sale[];
  settings: Record<string, string>;
  nextProductId: number;
  nextSaleId: number;
  nextInvoice: number;
}

function seed(): DbShape {
  return {
    products: [
      mkProduct(1, "CW-1001", "Cashmere Wrap Coat", "Outerwear", "Maison Atelier", "M", "Camel", "Cashmere", 180, 420, 6),
      mkProduct(2, "SLK-2044", "Silk Slip Dress", "Dresses", "Maison Atelier", "S", "Ivory", "Silk", 90, 240, 10),
      mkProduct(3, "WSJ-3310", "Wool Suit Jacket", "Suiting", "Maison Atelier", "L", "Charcoal", "Wool", 150, 360, 4),
      mkProduct(4, "CSH-4021", "Ribbed Cashmere Sweater", "Knitwear", "Maison Atelier", "M", "Oat", "Cashmere", 70, 180, 12),
      mkProduct(5, "LTH-5502", "Leather Belt", "Accessories", "Maison Atelier", "One Size", "Black", "Leather", 20, 65, 20),
      mkProduct(6, "SDE-6110", "Suede Ankle Boots", "Footwear", "Maison Atelier", "39", "Taupe", "Suede", 110, 290, 2),
    ],
    currencies: [
      { code: "NPR", name: "Nepalese Rupee", symbol: "Rs.", exchange_rate: 1, is_base: true },
      { code: "INR", name: "Indian Rupee", symbol: "\u20B9", exchange_rate: 1.6, is_base: false },
      { code: "USD", name: "US Dollar", symbol: "$", exchange_rate: 133, is_base: false },
      { code: "EUR", name: "Euro", symbol: "\u20AC", exchange_rate: 144, is_base: false },
      { code: "GBP", name: "British Pound", symbol: "\u00A3", exchange_rate: 168, is_base: false },
      { code: "AED", name: "UAE Dirham", symbol: "AED", exchange_rate: 36, is_base: false },
    ],
    categories: ["Outerwear", "Dresses", "Suiting", "Knitwear", "Accessories", "Footwear"],
    sales: [],
    settings: {
      store_name: "Maison Atelier",
      store_address: "",
      store_phone: "",
      base_currency: "NPR",
      tax_rate: "0",
      invoice_prefix: "INV",
      next_invoice_number: "1001",
    },
    nextProductId: 7,
    nextSaleId: 1,
    nextInvoice: 1001,
  };
}

function mkProduct(
  id: number,
  sku: string,
  name: string,
  category: string,
  brand: string,
  size: string,
  color: string,
  material: string,
  cost: number,
  price: number,
  qty: number,
): Product {
  const now = new Date().toISOString();
  return {
    id,
    sku,
    name,
    category,
    brand,
    size,
    color,
    material,
    cost_price: cost,
    sale_price: price,
    quantity: qty,
    reorder_level: 3,
    image_path: null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}

function load(): DbShape {
  if (typeof window === "undefined") return seed();
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    const fresh = seed();
    save(fresh);
    return fresh;
  }
  try {
    return JSON.parse(raw) as DbShape;
  } catch {
    return seed();
  }
}

function save(db: DbShape) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(db));
}

const delay = () => new Promise((r) => setTimeout(r, 120));

export async function listProducts(search?: string, category?: string): Promise<Product[]> {
  await delay();
  const db = load();
  return db.products.filter((p) => {
    if (!p.is_active) return false;
    if (search && !`${p.name} ${p.sku} ${p.brand ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && p.category !== category) return false;
    return true;
  });
}

export async function getProduct(id: number): Promise<Product | null> {
  await delay();
  return load().products.find((p) => p.id === id) ?? null;
}

export async function createProduct(product: Product): Promise<number> {
  await delay();
  const db = load();
  const id = db.nextProductId++;
  const now = new Date().toISOString();
  db.products.push({ ...product, id, is_active: true, created_at: now, updated_at: now });
  save(db);
  return id;
}

export async function updateProduct(product: Product): Promise<void> {
  await delay();
  const db = load();
  db.products = db.products.map((p) =>
    p.id === product.id ? { ...product, updated_at: new Date().toISOString() } : p,
  );
  save(db);
}

export async function deleteProduct(id: number): Promise<void> {
  await delay();
  const db = load();
  db.products = db.products.map((p) => (p.id === id ? { ...p, is_active: false } : p));
  save(db);
}

export async function adjustStock(id: number, delta: number): Promise<void> {
  await delay();
  const db = load();
  db.products = db.products.map((p) => (p.id === id ? { ...p, quantity: p.quantity + delta } : p));
  save(db);
}

export async function listCategories(): Promise<string[]> {
  await delay();
  return load().categories;
}

export async function createCategory(name: string): Promise<void> {
  await delay();
  const db = load();
  if (!db.categories.includes(name)) db.categories.push(name);
  save(db);
}

export async function lowStockProducts(): Promise<LowStockItem[]> {
  await delay();
  const db = load();
  return db.products
    .filter((p) => p.is_active && p.quantity <= p.reorder_level)
    .map((p) => ({ id: p.id as number, name: p.name, sku: p.sku, quantity: p.quantity, reorder_level: p.reorder_level }));
}

export async function createSale(sale: NewSale): Promise<Sale> {
  await delay();
  const db = load();
  const subtotal = sale.items.reduce((sum, i) => sum + i.unit_price * i.quantity - i.discount, 0);
  const taxable = Math.max(subtotal - sale.discount, 0);
  const tax_amount = taxable * (sale.tax_rate / 100);
  const total = taxable + tax_amount;
  const id = db.nextSaleId++;
  const invoice_no = `${db.settings.invoice_prefix}-${String(db.nextInvoice++).padStart(5, "0")}`;
  const created_at = new Date().toISOString();

  const items = sale.items.map((item, idx) => {
    const product = db.products.find((p) => p.id === item.product_id);
    const unit_cost = (product?.cost_price ?? 0) * sale.exchange_rate;
    return {
      ...item,
      id: id * 1000 + idx,
      sale_id: id,
      unit_cost,
      line_total: item.unit_price * item.quantity - item.discount,
    };
  });

  db.products = db.products.map((p) => {
    const sold = sale.items.find((i) => i.product_id === p.id);
    return sold ? { ...p, quantity: p.quantity - sold.quantity } : p;
  });

  const record: Sale = {
    id,
    invoice_no,
    customer_name: sale.customer_name,
    currency_code: sale.currency_code,
    exchange_rate: sale.exchange_rate,
    subtotal,
    discount: sale.discount,
    tax_rate: sale.tax_rate,
    tax_amount,
    total,
    payment_method: sale.payment_method,
    status: "completed",
    notes: sale.notes,
    created_at,
    items,
  };
  db.sales.unshift(record);
  save(db);
  return record;
}

export async function listSales(from?: string, to?: string, search?: string, paymentMethod?: string): Promise<Sale[]> {
  await delay();
  const db = load();
  return db.sales.filter((s) => {
    if (from && s.created_at < from) return false;
    if (to && s.created_at > to) return false;
    if (search && !`${s.invoice_no} ${s.customer_name ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (paymentMethod && s.payment_method !== paymentMethod) return false;
    return true;
  });
}

export async function voidSale(id: number): Promise<void> {
  await delay();
  const db = load();
  const sale = db.sales.find((s) => s.id === id);
  if (sale) {
    sale.status = "voided";
    db.products = db.products.map((p) => {
      const item = sale.items.find((i) => i.product_id === p.id);
      return item ? { ...p, quantity: p.quantity + item.quantity } : p;
    });
  }
  save(db);
}

export async function listCurrencies(): Promise<Currency[]> {
  await delay();
  return load().currencies;
}

export async function upsertCurrency(currency: Currency): Promise<void> {
  await delay();
  const db = load();
  const idx = db.currencies.findIndex((c) => c.code === currency.code);
  if (idx >= 0) db.currencies[idx] = { ...db.currencies[idx], ...currency };
  else db.currencies.push(currency);
  save(db);
}

export async function deleteCurrency(code: string): Promise<void> {
  await delay();
  const db = load();
  db.currencies = db.currencies.filter((c) => c.code !== code || c.is_base);
  save(db);
}

export async function setBaseCurrency(code: string): Promise<void> {
  await delay();
  const db = load();
  db.currencies = db.currencies.map((c) => ({ ...c, is_base: c.code === code, exchange_rate: c.code === code ? 1 : c.exchange_rate }));
  db.settings.base_currency = code;
  save(db);
}

export async function getSettings(): Promise<Record<string, string>> {
  await delay();
  return load().settings;
}

export async function updateSetting(key: string, value: string): Promise<void> {
  await delay();
  const db = load();
  db.settings[key] = value;
  save(db);
}

export async function dashboardStats(): Promise<DashboardStats> {
  await delay();
  const db = load();
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);
  const completed = db.sales.filter((s) => s.status === "completed");
  const todaySales = completed.filter((s) => s.created_at.startsWith(today));
  const monthSales = completed.filter((s) => s.created_at.startsWith(month));
  const profitOf = (sales: Sale[]) =>
    sales.reduce(
      (sum, s) => sum + s.items.reduce((iSum, i) => iSum + (i.line_total - i.unit_cost * i.quantity), 0) / s.exchange_rate,
      0,
    );
  return {
    today_sales_total: todaySales.reduce((sum, s) => sum + s.total / s.exchange_rate, 0),
    today_sales_count: todaySales.length,
    today_profit: profitOf(todaySales),
    month_sales_total: monthSales.reduce((sum, s) => sum + s.total / s.exchange_rate, 0),
    month_profit: profitOf(monthSales),
    total_products: db.products.filter((p) => p.is_active).length,
    low_stock_count: db.products.filter((p) => p.is_active && p.quantity <= p.reorder_level).length,
    base_currency: db.settings.base_currency,
  };
}
