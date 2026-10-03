require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { pool, migrate, hashPassword, verifyPassword } = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const asyncH = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });

// In-memory token store mapped to user objects
const sessions = new Map();

function generateToken(user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    created_at: Date.now(),
  });
  return token;
}

function getAuthUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
  return sessions.get(token) || null;
}

const toProduct = (r) => ({
  id: r.id,
  sku: r.sku,
  name: r.name,
  category: r.category,
  brand: r.brand,
  size: r.size,
  color: r.color,
  material: r.material,
  cost_price: Number(r.cost_price),
  sale_price: Number(r.sale_price),
  quantity: r.quantity,
  reorder_level: r.reorder_level,
  image_path: r.image_path,
  is_active: r.is_active,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

const toSale = (r) => ({
  id: r.id,
  invoice_no: r.invoice_no,
  customer_name: r.customer_name,
  currency_code: r.currency_code,
  exchange_rate: Number(r.exchange_rate),
  subtotal: Number(r.subtotal),
  discount: Number(r.discount),
  tax_rate: Number(r.tax_rate),
  tax_amount: Number(r.tax_amount),
  total: Number(r.total),
  payment_method: r.payment_method,
  status: r.status,
  notes: r.notes,
  created_at: r.created_at,
  items: [],
  refunds: [],
});

const toSaleItem = (r) => ({
  id: r.id,
  sale_id: r.sale_id,
  product_id: r.product_id,
  product_name: r.product_name,
  sku: r.sku,
  unit_price: Number(r.unit_price),
  unit_cost: Number(r.unit_cost),
  quantity: r.quantity,
  discount: Number(r.discount),
  line_total: Number(r.line_total),
});

// ---------- Authentication ----------
app.post(
  "/api/auth/login",
  asyncH(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const { rows } = await pool.query("SELECT * FROM users WHERE username = $1 AND is_active = true", [username.trim()]);
    const user = rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    });
  })
);

app.get(
  "/api/auth/me",
  asyncH(async (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.json({ user });
  })
);

// ---------- Users Management ----------
app.get(
  "/api/users",
  asyncH(async (req, res) => {
    const { rows } = await pool.query(
      "SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY created_at ASC"
    );
    res.json(rows);
  })
);

app.post(
  "/api/users",
  asyncH(async (req, res) => {
    const { username, password, full_name, role } = req.body;
    if (!username || !password || !full_name) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const passHash = hashPassword(password);
    const { rows } = await pool.query(
      "INSERT INTO users (username, password_hash, full_name, role) VALUES ($1,$2,$3,$4) RETURNING id",
      [username.trim(), passHash, full_name.trim(), role || "cashier"]
    );
    res.json({ id: rows[0].id, ok: true });
  })
);

app.put(
  "/api/users/:id",
  asyncH(async (req, res) => {
    const { full_name, role, password, is_active } = req.body;
    if (password) {
      const passHash = hashPassword(password);
      await pool.query(
        "UPDATE users SET full_name=$1, role=$2, password_hash=$3, is_active=$4, updated_at=now() WHERE id=$5",
        [full_name, role, passHash, is_active ?? true, req.params.id]
      );
    } else {
      await pool.query(
        "UPDATE users SET full_name=$1, role=$2, is_active=$3, updated_at=now() WHERE id=$4",
        [full_name, role, is_active ?? true, req.params.id]
      );
    }
    res.json({ ok: true });
  })
);

app.delete(
  "/api/users/:id",
  asyncH(async (req, res) => {
    await pool.query("UPDATE users SET is_active = false, updated_at = now() WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  })
);

// ---------- Products & Filters ----------
app.get(
  "/api/products/filters",
  asyncH(async (req, res) => {
    const [cats, brands, sizes, colors] = await Promise.all([
      pool.query("SELECT DISTINCT category FROM products WHERE is_active = true AND category IS NOT NULL AND category != '' ORDER BY category ASC"),
      pool.query("SELECT DISTINCT brand FROM products WHERE is_active = true AND brand IS NOT NULL AND brand != '' ORDER BY brand ASC"),
      pool.query("SELECT DISTINCT size FROM products WHERE is_active = true AND size IS NOT NULL AND size != '' ORDER BY size ASC"),
      pool.query("SELECT DISTINCT color FROM products WHERE is_active = true AND color IS NOT NULL AND color != '' ORDER BY color ASC"),
    ]);
    res.json({
      categories: cats.rows.map((r) => r.category),
      brands: brands.rows.map((r) => r.brand),
      sizes: sizes.rows.map((r) => r.size),
      colors: colors.rows.map((r) => r.color),
    });
  })
);

app.get(
  "/api/products",
  asyncH(async (req, res) => {
    const { search, category, brand, size, color, inStockOnly } = req.query;
    const conds = ["is_active = true"];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conds.push(`(name ILIKE $${params.length} OR sku ILIKE $${params.length} OR brand ILIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      conds.push(`category = $${params.length}`);
    }
    if (brand) {
      params.push(brand);
      conds.push(`brand = $${params.length}`);
    }
    if (size) {
      params.push(size);
      conds.push(`size = $${params.length}`);
    }
    if (color) {
      params.push(color);
      conds.push(`color = $${params.length}`);
    }
    if (inStockOnly === "true") {
      conds.push("quantity > 0");
    }

    const { rows } = await pool.query(
      `SELECT * FROM products WHERE ${conds.join(" AND ")} ORDER BY name ASC`,
      params
    );
    res.json(rows.map(toProduct));
  })
);

app.get(
  "/api/products/low-stock",
  asyncH(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, name, sku, quantity, reorder_level FROM products
       WHERE is_active = true AND quantity <= reorder_level ORDER BY quantity ASC`
    );
    res.json(rows);
  })
);

app.get(
  "/api/products/:id",
  asyncH(async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    res.json(rows[0] ? toProduct(rows[0]) : null);
  })
);

app.post(
  "/api/products",
  asyncH(async (req, res) => {
    const p = req.body;
    const { rows } = await pool.query(
      `INSERT INTO products (sku, name, category, brand, size, color, material, cost_price, sale_price, quantity, reorder_level, image_path, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,now(),now()) RETURNING id`,
      [p.sku, p.name, p.category, p.brand, p.size, p.color, p.material, p.cost_price, p.sale_price, p.quantity, p.reorder_level, p.image_path]
    );
    res.json(rows[0].id);
  })
);

app.put(
  "/api/products/:id",
  asyncH(async (req, res) => {
    const p = req.body;
    await pool.query(
      `UPDATE products SET sku=$1, name=$2, category=$3, brand=$4, size=$5, color=$6, material=$7,
       cost_price=$8, sale_price=$9, quantity=$10, reorder_level=$11, image_path=$12, updated_at=now()
       WHERE id = $13`,
      [p.sku, p.name, p.category, p.brand, p.size, p.color, p.material, p.cost_price, p.sale_price, p.quantity, p.reorder_level, p.image_path, req.params.id]
    );
    res.json({ ok: true });
  })
);

app.delete(
  "/api/products/:id",
  asyncH(async (req, res) => {
    await pool.query("UPDATE products SET is_active = false WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  })
);

app.post(
  "/api/products/:id/adjust-stock",
  asyncH(async (req, res) => {
    await pool.query(
      "UPDATE products SET quantity = quantity + $1, updated_at = now() WHERE id = $2",
      [req.body.delta, req.params.id]
    );
    res.json({ ok: true });
  })
);

// ---------- Categories ----------
app.get(
  "/api/categories",
  asyncH(async (req, res) => {
    const { rows } = await pool.query("SELECT name FROM categories ORDER BY name ASC");
    res.json(rows.map((r) => r.name));
  })
);

app.post(
  "/api/categories",
  asyncH(async (req, res) => {
    await pool.query("INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING", [req.body.name]);
    res.json({ ok: true });
  })
);

// ---------- Sales & Refunds ----------
app.post(
  "/api/sales",
  asyncH(async (req, res) => {
    const sale = req.body;
    if (!sale.items || sale.items.length === 0) {
      return res.status(400).json({ error: "Cannot record a sale with no items" });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const subtotal = sale.items.reduce((s, i) => s + i.unit_price * i.quantity - i.discount, 0);
      const taxable = Math.max(subtotal - sale.discount, 0);
      const tax_amount = taxable * (sale.tax_rate / 100);
      const total = taxable + tax_amount;

      const { rows: prefRows } = await client.query(
        "SELECT value FROM settings WHERE key = 'invoice_prefix' FOR UPDATE"
      );
      const { rows: numRows } = await client.query(
        "SELECT value FROM settings WHERE key = 'next_invoice_number' FOR UPDATE"
      );
      const prefix = prefRows[0].value;
      const next = parseInt(numRows[0].value, 10) || 1000;
      await client.query("UPDATE settings SET value = $1 WHERE key = 'next_invoice_number'", [String(next + 1)]);
      const invoice_no = `${prefix}-${String(next).padStart(5, "0")}`;

      const { rows: saleRows } = await client.query(
        `INSERT INTO sales (invoice_no, customer_name, currency_code, exchange_rate, subtotal, discount, tax_rate, tax_amount, total, payment_method, status, notes, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'completed',$11,now()) RETURNING id, created_at`,
        [invoice_no, sale.customer_name, sale.currency_code, sale.exchange_rate, subtotal, sale.discount, sale.tax_rate, tax_amount, total, sale.payment_method, sale.notes]
      );
      const sale_id = saleRows[0].id;

      const items_out = [];
      for (const item of sale.items) {
        const line_total = item.unit_price * item.quantity - item.discount;
        const { rows: prodRows } = await client.query("SELECT cost_price FROM products WHERE id = $1", [item.product_id]);
        const cost_price_base = prodRows[0] ? Number(prodRows[0].cost_price) : 0;
        const unit_cost = cost_price_base * sale.exchange_rate;

        const { rows: itemRows } = await client.query(
          `INSERT INTO sale_items (sale_id, product_id, product_name, sku, unit_price, unit_cost, quantity, discount, line_total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [sale_id, item.product_id, item.product_name, item.sku, item.unit_price, unit_cost, item.quantity, item.discount, line_total]
        );

        await client.query(
          "UPDATE products SET quantity = quantity - $1, updated_at = now() WHERE id = $2",
          [item.quantity, item.product_id]
        );

        items_out.push({
          id: itemRows[0].id,
          sale_id,
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          unit_price: item.unit_price,
          unit_cost,
          quantity: item.quantity,
          discount: item.discount,
          line_total,
        });
      }

      await client.query("COMMIT");

      res.json({
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
        status: "completed",
        notes: sale.notes,
        created_at: saleRows[0].created_at,
        items: items_out,
        refunds: [],
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

app.get(
  "/api/sales",
  asyncH(async (req, res) => {
    const { from, to, search, paymentMethod, status } = req.query;
    const conds = ["1=1"];
    const params = [];
    if (from) {
      params.push(from);
      conds.push(`created_at >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conds.push(`created_at <= $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(invoice_no ILIKE $${params.length} OR customer_name ILIKE $${params.length})`);
    }
    if (paymentMethod) {
      params.push(paymentMethod);
      conds.push(`payment_method = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conds.push(`status = $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT * FROM sales WHERE ${conds.join(" AND ")} ORDER BY created_at DESC LIMIT 500`,
      params
    );
    const sales = rows.map(toSale);

    if (sales.length) {
      const ids = sales.map((s) => s.id);
      const { rows: itemRows } = await pool.query(
        "SELECT * FROM sale_items WHERE sale_id = ANY($1::int[])",
        [ids]
      );
      const bySale = {};
      for (const r of itemRows) {
        (bySale[r.sale_id] ||= []).push(toSaleItem(r));
      }

      // Fetch refunds for these sales
      const { rows: refundRows } = await pool.query(
        `SELECT r.*, ri.sale_item_id, ri.product_id, ri.product_name, ri.sku, ri.unit_price, ri.quantity as refund_qty, ri.refund_line_total, ri.restock_inventory
         FROM refunds r
         JOIN refund_items ri ON r.id = ri.refund_id
         WHERE r.sale_id = ANY($1::int[])
         ORDER BY r.created_at DESC`,
        [ids]
      );

      const refundsBySale = {};
      for (const r of refundRows) {
        if (!refundsBySale[r.sale_id]) refundsBySale[r.sale_id] = {};
        if (!refundsBySale[r.sale_id][r.id]) {
          refundsBySale[r.sale_id][r.id] = {
            id: r.id,
            sale_id: r.sale_id,
            refund_no: r.refund_no,
            customer_name: r.customer_name,
            refund_amount: Number(r.refund_amount),
            payment_method: r.payment_method,
            reason: r.reason,
            processed_by: r.processed_by,
            created_at: r.created_at,
            items: [],
          };
        }
        refundsBySale[r.sale_id][r.id].items.push({
          sale_item_id: r.sale_item_id,
          product_id: r.product_id,
          product_name: r.product_name,
          sku: r.sku,
          unit_price: Number(r.unit_price),
          quantity: r.refund_qty,
          refund_line_total: Number(r.refund_line_total),
          restock_inventory: r.restock_inventory,
        });
      }

      for (const s of sales) {
        s.items = bySale[s.id] || [];
        s.refunds = Object.values(refundsBySale[s.id] || {});
      }
    }
    res.json(sales);
  })
);

app.post(
  "/api/sales/:id/refund",
  asyncH(async (req, res) => {
    const saleId = parseInt(req.params.id, 10);
    const { items, payment_method, reason, processed_by } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: "No refund items provided" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Fetch sale
      const { rows: saleRows } = await client.query("SELECT * FROM sales WHERE id = $1 FOR UPDATE", [saleId]);
      if (!saleRows.length) {
        throw new Error("Sale not found");
      }
      const sale = saleRows[0];
      if (sale.status === "voided" || sale.status === "refunded") {
        throw new Error(`Cannot refund sale with status '${sale.status}'`);
      }

      // Fetch existing refund item quantities for this sale
      const { rows: prevRefundItems } = await client.query(
        `SELECT ri.sale_item_id, SUM(ri.quantity) as total_refunded
         FROM refund_items ri
         JOIN refunds r ON ri.refund_id = r.id
         WHERE r.sale_id = $1
         GROUP BY ri.sale_item_id`,
        [saleId]
      );
      const refundedMap = new Map();
      for (const r of prevRefundItems) {
        refundedMap.set(r.sale_item_id, Number(r.total_refunded));
      }

      // Fetch original sale items
      const { rows: saleItems } = await client.query("SELECT * FROM sale_items WHERE sale_id = $1", [saleId]);
      const saleItemMap = new Map(saleItems.map((si) => [si.id, si]));

      // Generate refund number
      const { rows: countRows } = await client.query("SELECT COUNT(*) FROM refunds WHERE sale_id = $1", [saleId]);
      const refundCount = parseInt(countRows[0].count, 10) + 1;
      const refund_no = `REF-${sale.invoice_no}-${refundCount}`;

      let totalRefundAmount = 0;
      const processedRefundItems = [];

      for (const reqItem of items) {
        const originalItem = saleItemMap.get(reqItem.sale_item_id);
        if (!originalItem) {
          throw new Error(`Item ID ${reqItem.sale_item_id} not found in original sale`);
        }
        const alreadyRefunded = refundedMap.get(reqItem.sale_item_id) || 0;
        const maxRefundable = originalItem.quantity - alreadyRefunded;

        if (reqItem.quantity <= 0 || reqItem.quantity > maxRefundable) {
          throw new Error(
            `Invalid refund quantity for ${originalItem.product_name}. Maximum refundable: ${maxRefundable}`
          );
        }

        const unitPrice = Number(originalItem.unit_price);
        const refundLineTotal = unitPrice * reqItem.quantity;
        totalRefundAmount += refundLineTotal;

        processedRefundItems.push({
          sale_item_id: originalItem.id,
          product_id: originalItem.product_id,
          product_name: originalItem.product_name,
          sku: originalItem.sku,
          unit_price: unitPrice,
          quantity: reqItem.quantity,
          refund_line_total: refundLineTotal,
          restock_inventory: reqItem.restock_inventory !== false, // default true ("everything goes back")
        });
      }

      // Create refund header record
      const { rows: refundHeaderRows } = await client.query(
        `INSERT INTO refunds (sale_id, refund_no, customer_name, refund_amount, payment_method, reason, processed_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,now()) RETURNING id, created_at`,
        [
          saleId,
          refund_no,
          sale.customer_name,
          totalRefundAmount,
          payment_method || sale.payment_method,
          reason || "Customer refund",
          processed_by || "Staff",
        ]
      );
      const refundId = refundHeaderRows[0].id;

      // Insert refund items & update inventory stock
      for (const item of processedRefundItems) {
        await client.query(
          `INSERT INTO refund_items (refund_id, sale_item_id, product_id, product_name, sku, unit_price, quantity, refund_line_total, restock_inventory)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            refundId,
            item.sale_item_id,
            item.product_id,
            item.product_name,
            item.sku,
            item.unit_price,
            item.quantity,
            item.refund_line_total,
            item.restock_inventory,
          ]
        );

        // RESTOCK INVENTORY - Everything goes back to inventory
        if (item.restock_inventory && item.product_id) {
          await client.query(
            "UPDATE products SET quantity = quantity + $1, updated_at = now() WHERE id = $2",
            [item.quantity, item.product_id]
          );
        }
      }

      // Determine updated sale status (fully refunded vs partially refunded)
      const { rows: totalRefundedRows } = await client.query(
        `SELECT SUM(ri.quantity) as total_qty_refunded
         FROM refund_items ri
         JOIN refunds r ON ri.refund_id = r.id
         WHERE r.sale_id = $1`,
        [saleId]
      );
      const totalQtyRefunded = parseInt(totalRefundedRows[0].total_qty_refunded, 10) || 0;
      const totalOriginalQty = saleItems.reduce((acc, i) => acc + i.quantity, 0);

      const newStatus = totalQtyRefunded >= totalOriginalQty ? "refunded" : "partially_refunded";
      await client.query("UPDATE sales SET status = $1 WHERE id = $2", [newStatus, saleId]);

      await client.query("COMMIT");

      res.json({
        ok: true,
        refund_id: refundId,
        refund_no,
        sale_status: newStatus,
        refund_amount: totalRefundAmount,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

app.post(
  "/api/sales/:id/void",
  asyncH(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT product_id, quantity FROM sale_items WHERE sale_id = $1",
        [req.params.id]
      );
      for (const row of rows) {
        if (row.product_id) {
          await client.query("UPDATE products SET quantity = quantity + $1 WHERE id = $2", [row.quantity, row.product_id]);
        }
      }
      await client.query("UPDATE sales SET status = 'voided' WHERE id = $1", [req.params.id]);
      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

// ---------- Currencies ----------
app.get(
  "/api/currencies",
  asyncH(async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM currencies ORDER BY is_base DESC, code ASC");
    res.json(rows.map((r) => ({ ...r, exchange_rate: Number(r.exchange_rate) })));
  })
);

app.put(
  "/api/currencies/:code",
  asyncH(async (req, res) => {
    const c = req.body;
    await pool.query(
      `INSERT INTO currencies (code, name, symbol, exchange_rate, is_base) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (code) DO UPDATE SET name = excluded.name, symbol = excluded.symbol, exchange_rate = excluded.exchange_rate`,
      [req.params.code, c.name, c.symbol, c.exchange_rate, !!c.is_base]
    );
    res.json({ ok: true });
  })
);

app.delete(
  "/api/currencies/:code",
  asyncH(async (req, res) => {
    await pool.query("DELETE FROM currencies WHERE code = $1 AND is_base = false", [req.params.code]);
    res.json({ ok: true });
  })
);

app.post(
  "/api/currencies/:code/set-base",
  asyncH(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE currencies SET is_base = false");
      await client.query("UPDATE currencies SET is_base = true, exchange_rate = 1.0 WHERE code = $1", [req.params.code]);
      await client.query("UPDATE settings SET value = $1 WHERE key = 'base_currency'", [req.params.code]);
      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

// ---------- Settings ----------
app.get(
  "/api/settings",
  asyncH(async (req, res) => {
    const { rows } = await pool.query("SELECT key, value FROM settings");
    const map = {};
    for (const r of rows) map[r.key] = r.value;
    res.json(map);
  })
);

app.put(
  "/api/settings/:key",
  asyncH(async (req, res) => {
    await pool.query(
      "INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
      [req.params.key, req.body.value]
    );
    res.json({ ok: true });
  })
);

// ---------- Dashboard ----------
app.get(
  "/api/dashboard/stats",
  asyncH(async (req, res) => {
    const { rows: baseRows } = await pool.query("SELECT value FROM settings WHERE key = 'base_currency'");
    const base_currency = baseRows[0]?.value || "NPR";

    const q = async (sql) => (await pool.query(sql)).rows[0].v;

    const today_sales_total = await q(
      `SELECT COALESCE(SUM(total / exchange_rate), 0) v FROM sales WHERE status IN ('completed', 'partially_refunded') AND created_at::date = CURRENT_DATE`
    );
    const today_sales_count = await q(
      `SELECT COUNT(*) v FROM sales WHERE status IN ('completed', 'partially_refunded') AND created_at::date = CURRENT_DATE`
    );
    const today_profit = await q(
      `SELECT COALESCE(SUM((si.line_total - si.unit_cost * si.quantity) / s.exchange_rate), 0) v
       FROM sale_items si JOIN sales s ON si.sale_id = s.id
       WHERE s.status IN ('completed', 'partially_refunded') AND s.created_at::date = CURRENT_DATE`
    );
    const month_sales_total = await q(
      `SELECT COALESCE(SUM(total / exchange_rate), 0) v FROM sales WHERE status IN ('completed', 'partially_refunded') AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)`
    );
    const month_profit = await q(
      `SELECT COALESCE(SUM((si.line_total - si.unit_cost * si.quantity) / s.exchange_rate), 0) v
       FROM sale_items si JOIN sales s ON si.sale_id = s.id
       WHERE s.status IN ('completed', 'partially_refunded') AND date_trunc('month', s.created_at) = date_trunc('month', CURRENT_DATE)`
    );
    const total_products = await q(`SELECT COUNT(*) v FROM products WHERE is_active = true`);
    const low_stock_count = await q(`SELECT COUNT(*) v FROM products WHERE is_active = true AND quantity <= reorder_level`);

    res.json({
      today_sales_total: Number(today_sales_total),
      today_sales_count: Number(today_sales_count),
      today_profit: Number(today_profit),
      month_sales_total: Number(month_sales_total),
      month_profit: Number(month_profit),
      total_products: Number(total_products),
      low_stock_count: Number(low_stock_count),
      base_currency,
    });
  })
);

// ---------- Health check (used by Tauri sidecar readiness poll) ----------
app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;

migrate()
  .then(() => {
    app.listen(PORT, () => console.log(`Luxe POS API listening on :${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to migrate/start:", err);
    process.exit(1);
  });
