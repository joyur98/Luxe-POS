use crate::db::Db;
use crate::models::{LowStockItem, Product};
use chrono::Utc;
use rusqlite::{params, OptionalExtension};
use tauri::State;

fn row_to_product(row: &rusqlite::Row) -> rusqlite::Result<Product> {
    Ok(Product {
        id: row.get(0)?,
        sku: row.get(1)?,
        name: row.get(2)?,
        category: row.get(3)?,
        brand: row.get(4)?,
        size: row.get(5)?,
        color: row.get(6)?,
        material: row.get(7)?,
        cost_price: row.get(8)?,
        sale_price: row.get(9)?,
        quantity: row.get(10)?,
        reorder_level: row.get(11)?,
        image_path: row.get(12)?,
        is_active: row.get::<_, i64>(13)? != 0,
        created_at: row.get(14)?,
        updated_at: row.get(15)?,
    })
}

const SELECT_COLS: &str = "id, sku, name, category, brand, size, color, material, cost_price, sale_price, quantity, reorder_level, image_path, is_active, created_at, updated_at";

#[tauri::command]
pub fn list_products(db: State<Db>, search: Option<String>, category: Option<String>) -> Result<Vec<Product>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut sql = format!("SELECT {} FROM products WHERE is_active = 1", SELECT_COLS);
    if search.is_some() {
        sql.push_str(" AND (name LIKE :q OR sku LIKE :q OR brand LIKE :q)");
    }
    if category.is_some() {
        sql.push_str(" AND category = :cat");
    }
    sql.push_str(" ORDER BY name ASC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let q = search.map(|s| format!("%{}%", s));

    let rows = if q.is_some() && category.is_some() {
        stmt.query_map(
            rusqlite::named_params! { ":q": q.unwrap(), ":cat": category.unwrap() },
            row_to_product,
        )
    } else if q.is_some() {
        stmt.query_map(rusqlite::named_params! { ":q": q.unwrap() }, row_to_product)
    } else if category.is_some() {
        stmt.query_map(rusqlite::named_params! { ":cat": category.unwrap() }, row_to_product)
    } else {
        stmt.query_map([], row_to_product)
    }
    .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_product(db: State<Db>, id: i64) -> Result<Option<Product>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let sql = format!("SELECT {} FROM products WHERE id = ?1", SELECT_COLS);
    conn.query_row(&sql, params![id], row_to_product)
        .optional()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_product(db: State<Db>, product: Product) -> Result<i64, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO products (sku, name, category, brand, size, color, material, cost_price, sale_price, quantity, reorder_level, image_path, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 1, ?13, ?13)",
        params![
            product.sku,
            product.name,
            product.category,
            product.brand,
            product.size,
            product.color,
            product.material,
            product.cost_price,
            product.sale_price,
            product.quantity,
            product.reorder_level,
            product.image_path,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn update_product(db: State<Db>, product: Product) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = product.id.ok_or("missing product id")?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE products SET sku=?1, name=?2, category=?3, brand=?4, size=?5, color=?6, material=?7,
         cost_price=?8, sale_price=?9, quantity=?10, reorder_level=?11, image_path=?12, updated_at=?13
         WHERE id = ?14",
        params![
            product.sku,
            product.name,
            product.category,
            product.brand,
            product.size,
            product.color,
            product.material,
            product.cost_price,
            product.sale_price,
            product.quantity,
            product.reorder_level,
            product.image_path,
            now,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_product(db: State<Db>, id: i64) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE products SET is_active = 0 WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn adjust_stock(db: State<Db>, id: i64, delta: i64) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE products SET quantity = quantity + ?1, updated_at = ?2 WHERE id = ?3",
        params![delta, Utc::now().to_rfc3339(), id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_categories(db: State<Db>) -> Result<Vec<String>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT name FROM categories ORDER BY name ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_category(db: State<Db>, name: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("INSERT OR IGNORE INTO categories (name) VALUES (?1)", params![name])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn low_stock_products(db: State<Db>) -> Result<Vec<LowStockItem>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, sku, quantity, reorder_level FROM products
             WHERE is_active = 1 AND quantity <= reorder_level ORDER BY quantity ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(LowStockItem {
                id: r.get(0)?,
                name: r.get(1)?,
                sku: r.get(2)?,
                quantity: r.get(3)?,
                reorder_level: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
