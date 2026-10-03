-- Luxe POS — Postgres schema

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'cashier', -- 'admin', 'manager', 'cashier'
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS currencies (
    code          TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    symbol        TEXT NOT NULL,
    exchange_rate NUMERIC NOT NULL,
    is_base       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS categories (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
    id            SERIAL PRIMARY KEY,
    sku           TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    category      TEXT,
    brand         TEXT,
    size          TEXT,
    color         TEXT,
    material      TEXT,
    cost_price    NUMERIC NOT NULL DEFAULT 0,
    sale_price    NUMERIC NOT NULL DEFAULT 0,
    quantity      INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 2,
    image_path    TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
    id    SERIAL PRIMARY KEY,
    name  TEXT NOT NULL,
    phone TEXT,
    email TEXT
);

CREATE TABLE IF NOT EXISTS sales (
    id             SERIAL PRIMARY KEY,
    invoice_no     TEXT NOT NULL UNIQUE,
    customer_id    INTEGER REFERENCES customers(id),
    customer_name  TEXT,
    currency_code  TEXT NOT NULL,
    exchange_rate  NUMERIC NOT NULL,
    subtotal       NUMERIC NOT NULL,
    discount       NUMERIC NOT NULL DEFAULT 0,
    tax_rate       NUMERIC NOT NULL DEFAULT 0,
    tax_amount     NUMERIC NOT NULL DEFAULT 0,
    total          NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'partially_refunded', 'refunded', 'voided'
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_items (
    id           SERIAL PRIMARY KEY,
    sale_id      INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id   INTEGER REFERENCES products(id),
    product_name TEXT NOT NULL,
    sku          TEXT NOT NULL,
    unit_price   NUMERIC NOT NULL,
    unit_cost    NUMERIC NOT NULL DEFAULT 0,
    quantity     INTEGER NOT NULL,
    discount     NUMERIC NOT NULL DEFAULT 0,
    line_total   NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS refunds (
    id             SERIAL PRIMARY KEY,
    sale_id        INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    refund_no      TEXT NOT NULL UNIQUE,
    customer_name  TEXT,
    refund_amount  NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    reason         TEXT,
    processed_by   TEXT NOT NULL DEFAULT 'System',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refund_items (
    id                 SERIAL PRIMARY KEY,
    refund_id          INTEGER NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
    sale_item_id       INTEGER REFERENCES sale_items(id),
    product_id         INTEGER REFERENCES products(id),
    product_name       TEXT NOT NULL,
    sku                TEXT NOT NULL,
    unit_price         NUMERIC NOT NULL,
    quantity           INTEGER NOT NULL,
    refund_line_total  NUMERIC NOT NULL,
    restock_inventory  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_size ON products(size);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_refunds_sale_id ON refunds(sale_id);
CREATE INDEX IF NOT EXISTS idx_refund_items_refund_id ON refund_items(refund_id);
