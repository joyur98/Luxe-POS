# Luxe POS

A general point-of-sale desktop application built for a luxury clothing
retailer, with multi-currency pricing (including Nepalese and Indian
rupees), inventory management, and sales/transaction management.

Built as a **Tauri** desktop app: **React + TypeScript** frontend,
**Rust** backend, local **SQLite** database. It runs fully offline and is
structured so a web version can reuse the same React frontend later — the
frontend never talks to SQLite directly, it only calls a small typed API
layer (`src/lib/api.ts`), which today calls Rust commands and could later
call a web backend with the same function signatures.

## Features

- **Point of Sale** — searchable product grid, cart, discounts, tax,
  multiple payment methods, receipt confirmation, live stock deduction.
- **Inventory management** — SKU, category, brand, size, color, material,
  cost/sale price, stock quantity, reorder level, low-stock indicators.
- **Sales management** — full transaction history, per-invoice detail,
  search, and voiding a sale (which restores stock).
- **Multi-currency** — add any currency (NPR and INR included by default
  alongside USD/EUR/GBP/AED), set a base currency, and switch the
  currency the register displays and charges in from the top bar. Prices
  are stored once in the base currency and converted on the fly.
- **Dashboard** — today's and this month's sales, catalog size, low-stock
  count, recent transactions.
- **Settings** — store details, invoice numbering, tax rate, currency
  management.

## Project structure

```
luxe-pos/
├─ src/                      React + TypeScript frontend
│  ├─ components/
│  │  ├─ layout/             Sidebar, Topbar
│  │  └─ ui/                 Button, Field/Input/Select, Card, Modal, Badge…
│  ├─ context/                CurrencyContext (selected currency, base currency)
│  ├─ lib/
│  │  ├─ api.ts               Typed bridge to the backend (Tauri or mock)
│  │  ├─ mockApi.ts           Browser-only mock backend (see below)
│  │  └─ format.ts            Currency/date formatting helpers
│  ├─ pages/
│  │  ├─ dashboard/
│  │  ├─ pos/                 Product grid, cart, checkout, receipt
│  │  ├─ inventory/           Product table + add/edit form
│  │  ├─ sales/                Sales history + detail/void
│  │  └─ settings/            Store details + currency management
│  ├─ types/                  Shared TS types mirroring the Rust models
│  ├─ App.tsx, main.tsx, index.css
├─ src-tauri/                 Rust backend
│  ├─ src/
│  │  ├─ main.rs              Tauri setup, command registration
│  │  ├─ db.rs                SQLite connection + migrations + seed data
│  │  ├─ models/mod.rs        Shared structs (Product, Sale, Currency…)
│  │  └─ commands/            One file per feature area:
│  │     products.rs            inventory CRUD, stock, categories
│  │     sales.rs                checkout, sale history, void
│  │     currencies.rs           multi-currency CRUD, base currency
│  │     settings.rs             store settings
│  │     dashboard.rs            summary stats
│  ├─ Cargo.toml
│  └─ tauri.conf.json
├─ package.json, vite.config.ts, tailwind.config.js, tsconfig.json
└─ index.html
```

## Running it

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- Tauri's platform dependencies — follow the official guide for your OS:
  https://v2.tauri.app/start/prerequisites/ (on Linux this installs
  `webkit2gtk`, `libayatana-appindicator`, etc.; on Windows you need the
  WebView2 runtime and MSVC build tools; on macOS you need Xcode command
  line tools)

### Install and run in development

```bash
npm install
npm run tauri dev
```

This opens the actual desktop window, backed by the Rust commands and a
local SQLite file (created automatically in your OS's app-data folder on
first run).

### Preview the UI only, in a browser

```bash
npm install
npm run dev
```

Opening `http://localhost:1420` in a normal browser tab runs the same
React app against `src/lib/mockApi.ts`, an in-memory/localStorage stand-in
for the Rust backend, pre-seeded with a handful of sample products. This
is only for quickly previewing the interface — the desktop build always
uses the real Rust + SQLite backend, never this mock.

### Build a distributable desktop app

```bash
npm run tauri build
```

Before your first production build, generate real app icons from a
1024×1024 PNG logo (a placeholder note is left in `src-tauri/icons/`):

```bash
npm run tauri icon path/to/logo.png
```

Installers are written to `src-tauri/target/release/bundle/`.

## Data & currency model

- Every product's `cost_price` and `sale_price` are stored once, in the
  store's **base currency** (NPR by default).
- Each row in the `currencies` table carries an `exchange_rate`: units of
  that currency per 1 unit of the base currency. Changing the currency in
  the top bar just re-renders converted amounts — it doesn't touch stored
  data.
- A completed sale (`sales` table) freezes the `currency_code` and
  `exchange_rate` used at checkout, so historical invoices stay accurate
  even if exchange rates or the base currency change later.
- Switching the base currency (Settings → Currencies → "Set as base")
  updates which currency is treated as the anchor going forward; it does
  not retroactively convert existing product prices, so re-check pricing
  after switching.

## Extending toward a web version

The frontend already isolates all data access behind `src/lib/api.ts`.
To add a web deployment later, implement the same method signatures
against an HTTP API (e.g. a small Axum/Actix service reusing the Rust
model structs) and swap the `inTauri` check in `api.ts` for an
environment check, or simply point the fetch calls at your web backend.
No page or component code needs to change.

## Notes

- The database file lives in your OS's standard app-data directory for
  `com.luxepos.app` (e.g. `~/.local/share/com.luxepos.app` on Linux,
  `~/Library/Application Support/com.luxepos.app` on macOS,
  `%APPDATA%\com.luxepos.app` on Windows) and is created automatically.
- This project was scaffolded by hand for this brief rather than via
  `npm create tauri-app`, so double-check dependency versions with
  `npm outdated` / `cargo update` before shipping.
