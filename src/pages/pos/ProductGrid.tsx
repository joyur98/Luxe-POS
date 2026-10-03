import { useEffect, useState } from "react";
import type { Product, ProductFilters } from "@/types";
import { api } from "@/lib/api";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Surfaces";
import { useCurrency } from "@/context/CurrencyContext";
import { convert, formatMoney } from "@/lib/format";

export function ProductGrid({ onAdd }: { onAdd: (product: Product) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtersOptions, setFiltersOptions] = useState<ProductFilters>({
    categories: [],
    brands: [],
    sizes: [],
    colors: [],
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

  const { selected } = useCurrency();

  useEffect(() => {
    api.getProductFilters().then(setFiltersOptions).catch(console.error);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      api
        .listProducts({
          search: search || undefined,
          category: category || undefined,
          brand: brand || undefined,
          size: size || undefined,
          inStockOnly: inStockOnly || undefined,
        })
        .then(setProducts)
        .catch(console.error);
    }, 150);
    return () => clearTimeout(handle);
  }, [search, category, brand, size, inStockOnly]);

  const hasActiveFilters = !!(search || category || brand || size || inStockOnly);

  function clearFilters() {
    setSearch("");
    setCategory("");
    setBrand("");
    setSize("");
    setInStockOnly(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top Multi-Attribute Filter Header */}
      <div className="border-b border-line bg-paper px-6 py-3.5 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search name, SKU, brand…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 text-xs"
          />

          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-40 text-xs"
          >
            <option value="">All Categories</option>
            {filtersOptions.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-36 text-xs"
          >
            <option value="">All Brands</option>
            {filtersOptions.brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>

          <Select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="w-32 text-xs"
          >
            <option value="">All Sizes</option>
            {filtersOptions.sizes.map((s) => (
              <option key={s} value={s}>
                Size: {s}
              </option>
            ))}
          </Select>

          <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="rounded border-line text-ink focus:ring-accent"
            />
            <span>In Stock Only</span>
          </label>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-danger hover:underline font-medium ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Quick Brand Filter Pills */}
        {filtersOptions.brands.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-semibold text-muted mr-1">Brand:</span>
            <button
              onClick={() => setBrand("")}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                brand === ""
                  ? "bg-ink text-paper"
                  : "bg-panel text-ink border border-line hover:border-accent"
              }`}
            >
              All
            </button>
            {filtersOptions.brands.map((b) => (
              <button
                key={b}
                onClick={() => setBrand(brand === b ? "" : b)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                  brand === b
                    ? "bg-ink text-paper"
                    : "bg-panel text-ink border border-line hover:border-accent"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Grid Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {products.length === 0 ? (
          <EmptyState
            title="No products found"
            hint="Try clearing your category, brand, or size filters."
          />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => onAdd(p)}
                disabled={p.quantity <= 0}
                className="group relative flex flex-col items-start rounded-lg border border-line bg-panel p-4 text-left shadow-sm transition-all hover:border-accent hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div>
                    {p.brand && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent-dark">
                        {p.brand}
                      </span>
                    )}
                    <p className="text-sm font-semibold leading-snug text-ink">{p.name}</p>
                  </div>

                  {p.size && (
                    <span className="shrink-0 rounded bg-accent-light/60 px-1.5 py-0.5 text-[11px] font-bold text-accent-dark border border-accent-light">
                      {p.size}
                    </span>
                  )}
                </div>

                <p className="mt-1.5 text-xs text-muted">
                  {p.sku} {p.color ? `· ${p.color}` : ""} {p.category ? `· ${p.category}` : ""}
                </p>

                <div className="mt-4 flex w-full items-center justify-between border-t border-line/60 pt-3">
                  <p className="text-sm font-bold text-ink">
                    {formatMoney(convert(p.sale_price, selected), selected)}
                  </p>
                  <p
                    className={`text-xs font-semibold ${
                      p.quantity <= p.reorder_level
                        ? "text-danger"
                        : p.quantity <= 5
                        ? "text-accent-dark"
                        : "text-success"
                    }`}
                  >
                    {p.quantity > 0 ? `${p.quantity} in stock` : "Out of stock"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
