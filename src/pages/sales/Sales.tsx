import { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Card, EmptyState, Badge } from "@/components/ui/Surfaces";
import { Input } from "@/components/ui/Field";
import { SaleDetail } from "./SaleDetail";
import { RefundModal } from "./RefundModal";
import type { Sale } from "@/types";
import { PAYMENT_METHODS } from "@/types";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

export function Sales() {
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selected, setSelected] = useState<Sale | null>(null);
  const [refundTarget, setRefundTarget] = useState<Sale | null>(null);

  async function load() {
    const items = await api.listSales(undefined, undefined, search || undefined);
    setAllSales(items);
  }

  useEffect(() => {
    const handle = setTimeout(load, 150);
    return () => clearTimeout(handle);
  }, [search]);

  const sales = useMemo(() => {
    return allSales.filter((s) => {
      if (paymentMethod && s.payment_method !== paymentMethod) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      return true;
    });
  }, [allSales, paymentMethod, statusFilter]);

  const breakdown = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const s of allSales) {
      if (s.status === "voided") continue;
      const entry = map.get(s.payment_method) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += s.total;
      map.set(s.payment_method, entry);
    }
    return map;
  }, [allSales]);

  async function handleVoid(sale: Sale) {
    if (!confirm(`Void invoice ${sale.invoice_no}? Stock will be returned to inventory.`)) return;
    await api.voidSale(sale.id);
    setSelected(null);
    load();
  }

  function handleOpenRefund(sale: Sale) {
    setSelected(null);
    setRefundTarget(sale);
  }

  function handleRefundSuccess() {
    load();
  }

  function getBadgeTone(status: string) {
    switch (status) {
      case "completed":
        return "success";
      case "partially_refunded":
        return "accent";
      case "refunded":
      case "voided":
        return "danger";
      default:
        return "neutral";
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar title="Sales & Refunds" subtitle="Transaction history, partial/full refunds & inventory restocking" />
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Payment method filter chips */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <FilterChip
            label="All Methods"
            active={paymentMethod === ""}
            onClick={() => setPaymentMethod("")}
            hint={`${allSales.filter((s) => s.status !== "voided").length}`}
          />
          {PAYMENT_METHODS.map((m) => {
            const entry = breakdown.get(m);
            return (
              <FilterChip
                key={m}
                label={m}
                active={paymentMethod === m}
                onClick={() => setPaymentMethod(m)}
                hint={entry ? String(entry.count) : "0"}
              />
            );
          })}
        </div>

        {/* Status filter bar */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search by invoice or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 text-xs"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="partially_refunded">Partially Refunded</option>
              <option value="refunded">Fully Refunded</option>
              <option value="voided">Voided</option>
            </select>
          </div>

          <p className="text-xs text-muted">
            {sales.length} transactions shown {paymentMethod ? `· via ${paymentMethod}` : ""}
          </p>
        </div>

        <Card>
          {sales.length === 0 ? (
            <EmptyState
              title="No sales found"
              hint={paymentMethod ? `No sales recorded via ${paymentMethod}` : "Transactions will appear here after POS checkout"}
            />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Payment</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Original Total</th>
                  <th className="px-5 py-3 text-right font-medium">Refunded</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const refundedTotal = (s.refunds || []).reduce((acc, r) => acc + r.refund_amount, 0);

                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className="cursor-pointer border-b border-line last:border-0 hover:bg-paper/60"
                    >
                      <td className="px-5 py-3 font-semibold text-ink">{s.invoice_no}</td>
                      <td className="px-5 py-3 text-muted">{formatDateTime(s.created_at)}</td>
                      <td className="px-5 py-3 text-muted">{s.customer_name || "Walk-in"}</td>
                      <td className="px-5 py-3 text-muted">{s.payment_method}</td>
                      <td className="px-5 py-3">
                        <Badge tone={getBadgeTone(s.status) as any}>
                          {s.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-ink">
                        {s.currency_code} {s.total.toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-right text-danger font-medium">
                        {refundedTotal > 0 ? `-${s.currency_code} ${refundedTotal.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <SaleDetail
        sale={selected}
        onClose={() => setSelected(null)}
        onVoid={handleVoid}
        onOpenRefund={handleOpenRefund}
      />

      <RefundModal
        sale={refundTarget}
        onClose={() => setRefundTarget(null)}
        onRefundSuccess={handleRefundSuccess}
      />
    </div>
  );
}

function FilterChip({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-line bg-panel text-ink hover:border-accent"
      }`}
    >
      {label}
      {hint !== undefined && (
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-paper/20" : "bg-line/60 text-muted"}`}>
          {hint}
        </span>
      )}
    </button>
  );
}
