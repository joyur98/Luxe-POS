use crate::db::Db;
use crate::models::{NewSale, Sale, SaleItem};
use chrono::Utc;
use rusqlite::params;
use tauri::State;

fn next_invoice_number(conn: &rusqlite::Connection) -> Result<String, String> {
    let prefix: String = conn
        .query_row("SELECT value FROM settings WHERE key = 'invoice_prefix'", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let next: i64 = conn
        .query_row("SELECT value FROM settings WHERE key = 'next_invoice_number'", [], |r| {
            r.get::<_, String>(0)
        })
        .map_err(|e| e.to_string())?
        .parse()
        .unwrap_or(1000);

    conn.execute(
        "UPDATE settings SET value = ?1 WHERE key = 'next_invoice_number'",
        params![(next + 1).to_string()],
    )
    .map_err(|e| e.to_string())?;

    Ok(format!("{}-{:05}", prefix, next))
}

#[tauri::command]
pub fn create_sale(db: State<Db>, sale: NewSale) -> Result<Sale, String> {
    let mut conn = db.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    if sale.items.is_empty() {
        return Err("Cannot record a sale with no items".into());
    }

    let subtotal: f64 = sale
        .items
        .iter()
        .map(|i| (i.unit_price * i.quantity as f64) - i.discount)
        .sum();
    let taxable = (subtotal - sale.discount).max(0.0);
    let tax_amount = taxable * (sale.tax_rate / 100.0);
    let total = taxable + tax_amount;

    let invoice_no = next_invoice_number(&tx)?;
    let now = Utc::now().to_rfc3339();

    tx.execute(
        "INSERT INTO sales (invoice_no, customer_name, currency_code, exchange_rate, subtotal, discount, tax_rate, tax_amount, total, payment_method, status, notes, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'completed', ?11, ?12)",
        params![
            invoice_no,
            sale.customer_name,
            sale.currency_code,
            sale.exchange_rate,
            subtotal,
            sale.discount,
            sale.tax_rate,
            tax_amount,
            total,
            sale.payment_method,
            sale.notes,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;

    let sale_id = tx.last_insert_rowid();

    let mut items_out: Vec<SaleItem> = Vec::new();
    for item in &sale.items {
        let line_total = (item.unit_price * item.quantity as f64) - item.discount;

        let cost_price_base: f64 = tx
            .query_row(
                "SELECT cost_price FROM products WHERE id = ?1",
                params![item.product_id],
                |r| r.get(0),
            )
            .unwrap_or(0.0);
        let unit_cost = cost_price_base * sale.exchange_rate;

        tx.execute(
            "INSERT INTO sale_items (sale_id, product_id, product_name, sku, unit_price, unit_cost, quantity, discount, line_total)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                sale_id,
                item.product_id,
                item.product_name,
                item.sku,
                item.unit_price,
                unit_cost,
                item.quantity,
                item.discount,
                line_total,
            ],
        )
        .map_err(|e| e.to_string())?;

        tx.execute(
            "UPDATE products SET quantity = quantity - ?1, updated_at = ?2 WHERE id = ?3",
            params![item.quantity, now, item.product_id],
        )
        .map_err(|e| e.to_string())?;

        items_out.push(SaleItem {
            id: tx.last_insert_rowid(),
            sale_id,
            product_id: Some(item.product_id),
            product_name: item.product_name.clone(),
            sku: item.sku.clone(),
            unit_price: item.unit_price,
            unit_cost,
            quantity: item.quantity,
            discount: item.discount,
            line_total,
        });
    }

    tx.commit().map_err(|e| e.to_string())?;

    Ok(Sale {
        id: sale_id,
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
        status: "completed".into(),
        notes: sale.notes,
        created_at: now,
        items: items_out,
    })
}

#[tauri::command]
pub fn list_sales(
    db: State<Db>,
    from: Option<String>,
    to: Option<String>,
    search: Option<String>,
    payment_method: Option<String>,
) -> Result<Vec<Sale>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut sql = "SELECT id, invoice_no, customer_name, currency_code, exchange_rate, subtotal, discount, tax_rate, tax_amount, total, payment_method, status, notes, created_at FROM sales WHERE 1=1".to_string();
    if from.is_some() {
        sql.push_str(" AND created_at >= :from");
    }
    if to.is_some() {
        sql.push_str(" AND created_at <= :to");
    }
    if search.is_some() {
        sql.push_str(" AND (invoice_no LIKE :q OR customer_name LIKE :q)");
    }
    sql.push_str(" ORDER BY created_at DESC LIMIT 500");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let map_row = |r: &rusqlite::Row| -> rusqlite::Result<Sale> {
        Ok(Sale {
            id: r.get(0)?,
            invoice_no: r.get(1)?,
            customer_name: r.get(2)?,
            currency_code: r.get(3)?,
            exchange_rate: r.get(4)?,
            subtotal: r.get(5)?,
            discount: r.get(6)?,
            tax_rate: r.get(7)?,
            tax_amount: r.get(8)?,
            total: r.get(9)?,
            payment_method: r.get(10)?,
            status: r.get(11)?,
            notes: r.get(12)?,
            created_at: r.get(13)?,
            items: vec![],
        })
    };

    let q = search.map(|s| format!("%{}%", s));
    let mut sales: Vec<Sale> = match (from.clone(), to.clone(), q.clone()) {
        (Some(f), Some(t), Some(q)) => stmt
            .query_map(rusqlite::named_params! { ":from": f, ":to": t, ":q": q }, map_row),
        (Some(f), Some(t), None) => stmt.query_map(rusqlite::named_params! { ":from": f, ":to": t }, map_row),
        (Some(f), None, None) => stmt.query_map(rusqlite::named_params! { ":from": f }, map_row),
        (None, Some(t), None) => stmt.query_map(rusqlite::named_params! { ":to": t }, map_row),
        (None, None, Some(q)) => stmt.query_map(rusqlite::named_params! { ":q": q }, map_row),
        _ => stmt.query_map([], map_row),
    }
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    if let Some(pm) = payment_method {
        sales.retain(|s| s.payment_method == pm);
    }

    for sale in &mut sales {
        let mut item_stmt = conn
            .prepare("SELECT id, sale_id, product_id, product_name, sku, unit_price, unit_cost, quantity, discount, line_total FROM sale_items WHERE sale_id = ?1")
            .map_err(|e| e.to_string())?;
        let items = item_stmt
            .query_map(params![sale.id], |r| {
                Ok(SaleItem {
                    id: r.get(0)?,
                    sale_id: r.get(1)?,
                    product_id: r.get(2)?,
                    product_name: r.get(3)?,
                    sku: r.get(4)?,
                    unit_price: r.get(5)?,
                    unit_cost: r.get(6)?,
                    quantity: r.get(7)?,
                    discount: r.get(8)?,
                    line_total: r.get(9)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        sale.items = items;
    }

    Ok(sales)
}

#[tauri::command]
pub fn void_sale(db: State<Db>, id: i64) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT product_id, quantity FROM sale_items WHERE sale_id = ?1")
        .map_err(|e| e.to_string())?;
    let rows: Vec<(Option<i64>, i64)> = stmt
        .query_map(params![id], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    for (product_id, qty) in rows {
        if let Some(pid) = product_id {
            conn.execute(
                "UPDATE products SET quantity = quantity + ?1 WHERE id = ?2",
                params![qty, pid],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    conn.execute("UPDATE sales SET status = 'voided' WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
