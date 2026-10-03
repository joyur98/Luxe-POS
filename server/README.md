# Luxe POS API (Postgres)

Minimal Express + Postgres backend for the web build of Luxe POS. The
desktop (Tauri) build still uses its bundled SQLite db — this server is for
running the app in a browser.

## Setup

```bash
cd server
npm install
cp .env.example .env   # set DATABASE_URL to your Postgres instance
npm start               # creates tables/seed data on boot, listens on :4000
```

## Frontend

In the project root, set `VITE_API_URL` (see `.env.example`) to point at
this server, then run the app normally with `npm run dev` in a browser tab
(not via `npm run tauri dev`).

## Notes

- Tables and default seed data (currencies, settings, categories) are
  created automatically on startup — no separate migration step needed.
- Routes mirror the original Tauri commands 1:1 (e.g. `list_products` →
  `GET /api/products`, `create_sale` → `POST /api/sales`).
