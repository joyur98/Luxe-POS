use crate::db::Db;
use crate::models::DashboardStats;
use chrono::Utc;
use tauri::State;

#[tauri::command]
pub fn dashboard_stats(db: State<Db>) -> Result<DashboardStats, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let today = Utc::now().format("%Y-%m-%d").to_string();
    let month = Utc::now().format("%Y-%m").to_string();
    let base_currency: String = conn
        .query_row("SELECT value FROM settings WHERE key = 'base_currency'", [], |r| r.get(0))
        .unwrap_or_else(|_| "NPR".to_string());

    let today_sales_total: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(total / exchange_rate), 0) FROM sales WHERE status = 'completed' AND created_at LIKE ?1",
            [format!("{}%", today)],
            |r| r.get(0),
        )
        .unwrap_or(0.0);

    let today_sales_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sales WHERE status = 'completed' AND created_at LIKE ?1",
            [format!("{}%", today)],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let today_profit: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM((si.line_total - si.unit_cost * si.quantity) / s.exchange_rate), 0)
             FROM sale_items si JOIN sales s ON si.sale_id = s.id
             WHERE s.status = 'completed' AND s.created_at LIKE ?1",
            [format!("{}%", today)],
            |r| r.get(0),
        )
        .unwrap_or(0.0);

    let month_sales_total: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(total / exchange_rate), 0) FROM sales WHERE status = 'completed' AND created_at LIKE ?1",
            [format!("{}%", month)],
            |r| r.get(0),
        )
        .unwrap_or(0.0);

    let month_profit: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM((si.line_total - si.unit_cost * si.quantity) / s.exchange_rate), 0)
             FROM sale_items si JOIN sales s ON si.sale_id = s.id
             WHERE s.status = 'completed' AND s.created_at LIKE ?1",
            [format!("{}%", month)],
            |r| r.get(0),
        )
        .unwrap_or(0.0);

    let total_products: i64 = conn
        .query_row("SELECT COUNT(*) FROM products WHERE is_active = 1", [], |r| r.get(0))
        .unwrap_or(0);

    let low_stock_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM products WHERE is_active = 1 AND quantity <= reorder_level",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    Ok(DashboardStats {
        today_sales_total,
        today_sales_count,
        today_profit,
        month_sales_total,
        month_profit,
        total_products,
        low_stock_count,
        base_currency,
    })
}
