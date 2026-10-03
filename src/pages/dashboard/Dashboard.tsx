import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardHeader, EmptyState, Badge } from "@/components/ui/Surfaces";
import { api } from "@/lib/api";
import { useCurrency } from "@/context/CurrencyContext";
import { convert, formatMoney } from "@/lib/format";
import type { DashboardStats, LowStockItem, Sale } from "@/types";
import { Link } from "react-router-dom";

export function Dashboard() {
  const { selected } = useCurrency();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [s, low, sales] = await Promise.all([
        api.dashboardStats(),
        api.lowStockProducts(),
        api.listSales(),
      ]);
      setStats(s);
      setLowStock(low.slice(0, 5));
      setRecentSales(sales.slice(0, 6));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar title="Dashboard" subtitle="Today's performance at a glance" />
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Today's sales"
            value={stats ? formatMoney(convert(stats.today_sales_total, selected), selected) : "—"}
            hint={stats ? `${stats.today_sales_count} transactions` : ""}
            loading={loading}
          />
          <StatCard
            label="Today's profit"
            value={stats ? formatMoney(convert(stats.today_profit, selected), selected) : "—"}
            hint={
              stats && stats.today_sales_total > 0
                ? `${((stats.today_profit / stats.today_sales_total) * 100).toFixed(1)}% margin`
                : "No sales yet"
            }
            loading={loading}
          />
          <StatCard
            label="Low stock"
            value={stats ? String(stats.low_stock_count) : "—"}
            hint="At or below reorder level"
            loading={loading}
            tone={stats && stats.low_stock_count > 0 ? "warn" : "neutral"}
          />
          <StatCard
            label="This month"
            value={stats ? formatMoney(convert(stats.month_sales_total, selected), selected) : "—"}
            hint="Completed sales"
            loading={loading}
          />
          <StatCard
            label="This month profit"
            value={stats ? formatMoney(convert(stats.month_profit, selected), selected) : "—"}
            hint={
              stats && stats.month_sales_total > 0
                ? `${((stats.month_profit / stats.month_sales_total) * 100).toFixed(1)}% margin`
                : "No sales yet"
            }
            loading={loading}
          />
          <StatCard
            label="Products in catalog"
            value={stats ? String(stats.total_products) : "—"}
            hint="Active items"
            loading={loading}
          />
        </div>

        <div className="mt-6 grid grid-cols-5 gap-5">
          <Card className="col-span-3">
            <CardHeader
              title="Recent sales"
              subtitle="Latest completed transactions"
              action={
                <Link to="/sales" className="text-xs font-medium text-accent hover:underline">
                  View all
                </Link>
              }
            />
            {recentSales.length === 0 ? (
              <EmptyState title="No sales yet" hint="Completed sales will appear here" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="px-5 py-3 font-medium">Invoice</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Items</th>
                    <th className="px-5 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((s) => (
                    <tr key={s.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-3 font-medium text-ink">{s.invoice_no}</td>
                      <td className="px-5 py-3 text-muted">{s.customer_name || "Walk-in"}</td>
                      <td className="px-5 py-3 text-muted">{s.items.length}</td>
                      <td className="px-5 py-3 text-right text-ink">
                        {formatMoney(s.total, { code: s.currency_code, symbol: "", exchange_rate: 1, name: "", is_base: false })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="col-span-2">
            <CardHeader title="Low stock" subtitle="Restock these soon" />
            {lowStock.length === 0 ? (
              <EmptyState title="Stock levels healthy" hint="Nothing needs reordering right now" />
            ) : (
              <ul className="divide-y divide-line">
                {lowStock.map((item) => (
                  <li key={item.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{item.name}</p>
                      <p className="text-xs text-muted">{item.sku}</p>
                    </div>
                    <Badge tone={item.quantity === 0 ? "danger" : "warn"}>
                      {item.quantity} left
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  loading,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
  tone?: "neutral" | "warn";
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone === "warn" ? "text-warn" : "text-ink"} ${loading ? "opacity-40" : ""}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
