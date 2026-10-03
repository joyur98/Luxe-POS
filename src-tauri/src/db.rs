use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct Db(pub Mutex<Connection>);

fn db_path(app: &AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_data_dir()
        .expect("could not resolve app data dir");
    fs::create_dir_all(&dir).expect("could not create app data dir");
    dir.join("luxe-pos.sqlite3")
}

pub fn init(app: &AppHandle) -> Db {
    let path = db_path(app);
    let conn = Connection::open(path).expect("failed to open database");
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS currencies (
            code          TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            symbol        TEXT NOT NULL,
            exchange_rate REAL NOT NULL,
            is_base       INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS categories (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS products (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            sku           TEXT NOT NULL UNIQUE,
            name          TEXT NOT NULL,
            category      TEXT,
            brand         TEXT,
            size          TEXT,
            color         TEXT,
            material      TEXT,
            cost_price    REAL NOT NULL DEFAULT 0,
            sale_price    REAL NOT NULL DEFAULT 0,
            quantity      INTEGER NOT NULL DEFAULT 0,
            reorder_level INTEGER NOT NULL DEFAULT 2,
            image_path    TEXT,
            is_active     INTEGER NOT NULL DEFAULT 1,
            created_at    TEXT NOT NULL,
            updated_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS customers (
            id    INTEGER PRIMARY KEY AUTOINCREMENT,
            name  TEXT NOT NULL,
            phone TEXT,
            email TEXT
        );

        CREATE TABLE IF NOT EXISTS sales (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_no     TEXT NOT NULL UNIQUE,
            customer_id    INTEGER REFERENCES customers(id),
            customer_name  TEXT,
            currency_code  TEXT NOT NULL,
            exchange_rate  REAL NOT NULL,
            subtotal       REAL NOT NULL,
            discount       REAL NOT NULL DEFAULT 0,
            tax_rate       REAL NOT NULL DEFAULT 0,
            tax_amount     REAL NOT NULL DEFAULT 0,
            total          REAL NOT NULL,
            payment_method TEXT NOT NULL,
            status         TEXT NOT NULL DEFAULT 'completed',
            notes          TEXT,
            created_at     TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sale_items (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id      INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
            product_id   INTEGER REFERENCES products(id),
            product_name TEXT NOT NULL,
            sku          TEXT NOT NULL,
            unit_price   REAL NOT NULL,
            unit_cost    REAL NOT NULL DEFAULT 0,
            quantity     INTEGER NOT NULL,
            discount     REAL NOT NULL DEFAULT 0,
            line_total   REAL NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
        CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
        "#,
    )
    .expect("failed to run migrations");

    migrate_existing_columns(&conn);
    seed_defaults(&conn);

    Db(Mutex::new(conn))
}

fn migrate_existing_columns(conn: &Connection) {
    let has_unit_cost: bool = conn
        .prepare("SELECT 1 FROM pragma_table_info('sale_items') WHERE name = 'unit_cost'")
        .and_then(|mut stmt| stmt.exists([]))
        .unwrap_or(true);
    if !has_unit_cost {
        conn.execute("ALTER TABLE sale_items ADD COLUMN unit_cost REAL NOT NULL DEFAULT 0", [])
            .ok();
    }
}

fn seed_defaults(conn: &Connection) {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM currencies", [], |r| r.get(0))
        .unwrap_or(0);

    if count == 0 {
        let defaults = [
            ("NPR", "Nepalese Rupee", "Rs.", 1.0, 1),
            ("INR", "Indian Rupee", "\u{20B9}", 1.6, 0),
            ("USD", "US Dollar", "$", 133.0, 0),
            ("EUR", "Euro", "\u{20AC}", 144.0, 0),
            ("GBP", "British Pound", "\u{00A3}", 168.0, 0),
            ("AED", "UAE Dirham", "AED", 36.0, 0),
        ];
        for (code, name, symbol, rate, is_base) in defaults {
            conn.execute(
                "INSERT INTO currencies (code, name, symbol, exchange_rate, is_base) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![code, name, symbol, rate, is_base],
            )
            .ok();
        }
    }

    let settings_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM settings", [], |r| r.get(0))
        .unwrap_or(0);

    if settings_count == 0 {
        let defaults = [
            ("store_name", "Maison Atelier"),
            ("store_address", ""),
            ("store_phone", ""),
            ("base_currency", "NPR"),
            ("tax_rate", "0"),
            ("invoice_prefix", "INV"),
            ("next_invoice_number", "1001"),
        ];
        for (k, v) in defaults {
            conn.execute(
                "INSERT INTO settings (key, value) VALUES (?1, ?2)",
                rusqlite::params![k, v],
            )
            .ok();
        }
    }

    let cat_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM categories", [], |r| r.get(0))
        .unwrap_or(0);
    if cat_count == 0 {
        for c in ["Outerwear", "Dresses", "Suiting", "Knitwear", "Accessories", "Footwear"] {
            conn.execute("INSERT INTO categories (name) VALUES (?1)", [c]).ok();
        }
    }
}
