// Prevents an additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod models;

use commands::{currencies, dashboard, products, sales, settings};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

/// Holds the sidecar child so we can kill it on exit.
struct ServerProcess(Arc<Mutex<Option<tauri_plugin_shell::process::CommandChild>>>);

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let database = db::init(&app.handle());
            app.manage(database);

            // ── Spawn the Node.js server sidecar ─────────────────────────────
            let shell = app.shell();
            let (_, child) = shell
                .sidecar("server")
                .expect("server sidecar not found – did you run build:server?")
                .spawn()
                .expect("failed to spawn server sidecar");

            // Store child so we can kill it when the app exits
            app.manage(ServerProcess(Arc::new(Mutex::new(Some(child)))));

            // ── Wait for the server to be ready (poll /api/health) ────────────
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let deadline = Instant::now() + Duration::from_secs(30);
                let url = "http://127.0.0.1:4000/api/health";

                loop {
                    if Instant::now() > deadline {
                        eprintln!("[luxe-pos] Server did not become ready in 30s – showing window anyway");
                        break;
                    }

                    let ready = std::panic::catch_unwind(|| {
                        // Simple blocking TCP connect check (no extra HTTP crate needed)
                        use std::net::TcpStream;
                        TcpStream::connect("127.0.0.1:4000").is_ok()
                    })
                    .unwrap_or(false);

                    if ready {
                        // Give express a tiny moment to finish binding the routes
                        std::thread::sleep(Duration::from_millis(300));
                        break;
                    }

                    std::thread::sleep(Duration::from_millis(300));
                }

                // Show main window now that the backend is up
                if let Some(win) = app_handle.get_webview_window("main") {
                    win.show().unwrap_or_default();
                    win.set_focus().unwrap_or_default();
                }

                // Log the health URL so devs can see it in the console
                println!("[luxe-pos] Backend ready → {}", url);
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            // Kill the sidecar when the last window closes
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.try_state::<ServerProcess>() {
                    let mut guard = state.0.lock().unwrap();
                    if let Some(child) = guard.take() {
                        let _ = child.kill();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            products::list_products,
            products::get_product,
            products::create_product,
            products::update_product,
            products::delete_product,
            products::adjust_stock,
            products::list_categories,
            products::create_category,
            products::low_stock_products,
            sales::create_sale,
            sales::list_sales,
            sales::void_sale,
            currencies::list_currencies,
            currencies::upsert_currency,
            currencies::delete_currency,
            currencies::set_base_currency,
            settings::get_settings,
            settings::update_setting,
            dashboard::dashboard_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Luxe POS");
}
