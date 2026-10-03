use crate::db::Db;
use crate::models::Currency;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub fn list_currencies(db: State<Db>) -> Result<Vec<Currency>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT code, name, symbol, exchange_rate, is_base FROM currencies ORDER BY is_base DESC, code ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(Currency {
                code: r.get(0)?,
                name: r.get(1)?,
                symbol: r.get(2)?,
                exchange_rate: r.get(3)?,
                is_base: r.get::<_, i64>(4)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn upsert_currency(db: State<Db>, currency: Currency) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO currencies (code, name, symbol, exchange_rate, is_base) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(code) DO UPDATE SET name = excluded.name, symbol = excluded.symbol, exchange_rate = excluded.exchange_rate",
        params![currency.code, currency.name, currency.symbol, currency.exchange_rate, currency.is_base as i64],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_currency(db: State<Db>, code: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM currencies WHERE code = ?1 AND is_base = 0", params![code])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn set_base_currency(db: State<Db>, code: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE currencies SET is_base = 0", []).map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE currencies SET is_base = 1, exchange_rate = 1.0 WHERE code = ?1",
        params![code],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE settings SET value = ?1 WHERE key = 'base_currency'",
        params![code],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
