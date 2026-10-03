import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Card, EmptyState, Badge } from "@/components/ui/Surfaces";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { ProductForm } from "./ProductForm";
import type { Product } from "@/types";
import { api } from "@/lib/api";
import { useCurrency } from "@/context/CurrencyContext";
import { convert, formatMoney } from "@/lib/format";

function MarginCell({ product }: { product: Product }) {
  const { selected } = useCurrency();
  const profit = product.sale_price - product.cost_price;
  const marginPct = product.sale_price > 0 ? (profit / product.sale_price) * 100 : 0;
  const tone = marginPct < 20 ? "text-warn" : "text-success";
  return (
    <div>
      <p className={`text-sm font-medium ${tone}`}>{marginPct.toFixed(0)}%</p>
      <p className="text-xs text-muted">{formatMoney(convert(profit, selected), selected)}</p>
    </div>
  );
}

export function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const { selected } = useCurrency();

  async function load() {
    const [items, cats] = await Promise.all([
      api.listProducts({ search: search || undefined, category: category || undefined }),
      api.listCategories(),
    ]);
    setProducts(items);
    setCategories(cats);
  }

  useEffect(() => {
    const handle = setTimeout(load, 150);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setFormOpen(true);
  }

  async function handleDelete(p: Product) {
    if (!p.id) return;
    if (!confirm(`Remove "${p.name}" from the catalog?`)) return;
    await api.deleteProduct(p.id);
    load();
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar title="Inventory" subtitle="Manage your product catalog and stock levels" />
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-44">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="primary" onClick={openNew}>
            + Add product
          </Button>
        </div>

        <Card>
          {products.length === 0 ? (
            <EmptyState title="No products" hint="Add your first product to get started" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Size / Color</th>
                  <th className="px-5 py-3 text-right font-medium">Price</th>
                  <th className="px-5 py-3 text-right font-medium">Margin</th>
                  <th className="px-5 py-3 text-right font-medium">Stock</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{p.name}</p>
                      <p className="text-xs text-muted">{p.brand}</p>
                    </td>
                    <td className="px-5 py-3 text-muted">{p.sku}</td>
                    <td className="px-5 py-3 text-muted">{p.category || "—"}</td>
                    <td className="px-5 py-3 text-muted">
                      {p.size || "—"} / {p.color || "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-ink">
                      {formatMoney(convert(p.sale_price, selected), selected)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <MarginCell product={p} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {p.quantity <= p.reorder_level ? (
                        <Badge tone={p.quantity === 0 ? "danger" : "warn"}>{p.quantity}</Badge>
                      ) : (
                        <span className="text-ink">{p.quantity}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => openEdit(p)}
                        className="mr-3 text-xs font-medium text-accent hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="text-xs font-medium text-danger hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <ProductForm
        open={formOpen}
        product={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          load();
        }}
      />
    </div>
  );
}
