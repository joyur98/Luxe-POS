const { Pool } = require("pg");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const dbUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/luxe_pos";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, originalHash] = stored.split(":");
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
}

async function ensureDatabaseExists() {
  try {
    const urlObj = new URL(dbUrl);
    const targetDb = urlObj.pathname.replace(/^\//, "");
    if (!targetDb || targetDb === "postgres") return;

    // Connect to default 'postgres' db to check / create target database
    urlObj.pathname = "/postgres";
    const sysPool = new Pool({ connectionString: urlObj.toString() });
    const { rows } = await sysPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDb]
    );
    if (rows.length === 0) {
      console.log(`Database '${targetDb}' does not exist. Creating...`);
      await sysPool.query(`CREATE DATABASE "${targetDb}"`);
    }
    await sysPool.end();
  } catch (err) {
    // If error occurs during database check (e.g. invalid URI), proceed and let Pool handle error
    console.warn("Database existence check warning:", err.message);
  }
}

const pool = new Pool({
  connectionString: dbUrl,
});

async function migrate() {
  await ensureDatabaseExists();
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  await seedDefaults();
}

async function seedDefaults() {
  // Seed Users
  const { rows: userRows } = await pool.query("SELECT COUNT(*) FROM users");
  if (Number(userRows[0].count) === 0) {
    const defaultUsers = [
      ["admin", hashPassword("admin123"), "Store Administrator", "admin"],
      ["cashier", hashPassword("cashier123"), "Front Desk Cashier", "cashier"],
      ["manager", hashPassword("manager123"), "Inventory Manager", "manager"],
    ];
    for (const [username, passHash, fullName, role] of defaultUsers) {
      await pool.query(
        "INSERT INTO users (username, password_hash, full_name, role) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",
        [username, passHash, fullName, role]
      );
    }
  }

  // Seed Currencies
  const { rows: curRows } = await pool.query("SELECT COUNT(*) FROM currencies");
  if (Number(curRows[0].count) === 0) {
    const defaults = [
      ["NPR", "Nepalese Rupee", "Rs.", 1.0, true],
      ["INR", "Indian Rupee", "\u20B9", 1.6, false],
      ["USD", "US Dollar", "$", 133.0, false],
      ["EUR", "Euro", "\u20AC", 144.0, false],
      ["GBP", "British Pound", "\u00A3", 168.0, false],
      ["AED", "UAE Dirham", "AED", 36.0, false],
    ];
    for (const [code, name, symbol, rate, isBase] of defaults) {
      await pool.query(
        "INSERT INTO currencies (code, name, symbol, exchange_rate, is_base) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
        [code, name, symbol, rate, isBase]
      );
    }
  }

  // Seed Settings
  const { rows: setRows } = await pool.query("SELECT COUNT(*) FROM settings");
  if (Number(setRows[0].count) === 0) {
    const defaults = [
      ["store_name", "Maison Atelier"],
      ["store_address", "Durbar Marg, Kathmandu"],
      ["store_phone", "+977 1 4220000"],
      ["base_currency", "NPR"],
      ["tax_rate", "13"],
      ["invoice_prefix", "INV"],
      ["next_invoice_number", "1001"],
    ];
    for (const [k, v] of defaults) {
      await pool.query(
        "INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [k, v]
      );
    }
  }

  // Seed Categories
  const { rows: catRows } = await pool.query("SELECT COUNT(*) FROM categories");
  if (Number(catRows[0].count) === 0) {
    for (const c of ["Outerwear", "Dresses", "Suiting", "Knitwear", "Accessories", "Footwear", "Watches"]) {
      await pool.query("INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING", [c]);
    }
  }

  // Seed Sample Products with Brands and Sizes if empty
  const { rows: prodRows } = await pool.query("SELECT COUNT(*) FROM products");
  if (Number(prodRows[0].count) === 0) {
    const sampleProducts = [
      ["SKU-COAT-01", "Cashmere Trench Coat", "Outerwear", "Burberry", "L", "Camel", "100% Cashmere", 85000, 145000, 12, 2],
      ["SKU-COAT-02", "Cashmere Trench Coat", "Outerwear", "Burberry", "M", "Camel", "100% Cashmere", 85000, 145000, 8, 2],
      ["SKU-COAT-03", "Cashmere Trench Coat", "Outerwear", "Burberry", "S", "Black", "100% Cashmere", 85000, 145000, 5, 2],
      ["SKU-SUIT-01", "Silk Wool Tuxedo Blazer", "Suiting", "Gucci", "40R", "Navy Blue", "Silk Wool", 92000, 168000, 6, 2],
      ["SKU-SUIT-02", "Silk Wool Tuxedo Blazer", "Suiting", "Gucci", "38R", "Navy Blue", "Silk Wool", 92000, 168000, 4, 2],
      ["SKU-DRESS-01", "Velvet Evening Gown", "Dresses", "Saint Laurent", "S", "Emerald Green", "Silk Velvet", 65000, 120000, 10, 3],
      ["SKU-KNIT-01", "Merino Crewneck Sweater", "Knitwear", "Prada", "M", "Charcoal", "Merino Wool", 25000, 48000, 15, 3],
      ["SKU-KNIT-02", "Merino Crewneck Sweater", "Knitwear", "Prada", "L", "Off White", "Merino Wool", 25000, 48000, 14, 3],
      ["SKU-BAG-01", "Quilted Leather Crossbody", "Accessories", "Chanel", "OneSize", "Black", "Lambskin", 120000, 240000, 7, 2],
      ["SKU-SHOE-01", "Monogram Leather Loafers", "Footwear", "Gucci", "42", "Brown", "Calfskin", 45000, 89000, 9, 2],
      ["SKU-SHOE-02", "Monogram Leather Loafers", "Footwear", "Gucci", "40", "Brown", "Calfskin", 45000, 89000, 5, 2],
      ["SKU-WATCH-01", "Oyster Perpetual 41", "Watches", "Rolex", "41mm", "Silver/Blue", "Oystersteel", 800000, 1350000, 3, 1],
    ];
    for (const [sku, name, cat, brand, size, color, mat, cost, sale, qty, reorder] of sampleProducts) {
      await pool.query(
        `INSERT INTO products (sku, name, category, brand, size, color, material, cost_price, sale_price, quantity, reorder_level, is_active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,now(),now()) ON CONFLICT (sku) DO NOTHING`,
        [sku, name, cat, brand, size, color, mat, cost, sale, qty, reorder]
      );
    }
  }
}

module.exports = { pool, migrate, hashPassword, verifyPassword };
