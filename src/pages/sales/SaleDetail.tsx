import { Modal } from "@/components/ui/Surfaces";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Surfaces";
import type { Sale } from "@/types";
import { formatDateTime } from "@/lib/format";
import { usePrint } from "@/context/PrintContext";

export function SaleDetail({
  sale,
  onClose,
  onVoid,
  onOpenRefund,
}: {
  sale: Sale | null;
  onClose: () => void;
  onVoid: (sale: Sale) => void;
  onOpenRefund: (sale: Sale) => void;
}) {
  const { printSale } = usePrint();
  if (!sale) return null;

  const profit = sale.items.reduce((sum, i) => sum + (i.line_total - i.unit_cost * i.quantity), 0);
  const marginPct = sale.subtotal > 0 ? (profit / sale.subtotal) * 100 : 0;

  const badgeTone =
    sale.status === "voided"
      ? "danger"
      : sale.status === "refunded"
      ? "danger"
      : sale.status === "partially_refunded"
      ? "accent"
      : "success";

  const totalRefundedAmount = (sale.refunds || []).reduce((acc, r) => acc + r.refund_amount, 0);

  return (
    <Modal open={!!sale} onClose={onClose} title={`Invoice ${sale.invoice_no}`} width="max-w-lg">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <p className="text-sm font-semibold text-ink">{sale.customer_name || "Walk-in customer"}</p>
          <p className="text-xs text-muted">{formatDateTime(sale.created_at)}</p>
        </div>
        <Badge tone={badgeTone as any}>{sale.status.replace("_", " ").toUpperCase()}</Badge>
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-semibold text-ink mb-1.5">Items Purchased:</h4>
        <div className="divide-y divide-line rounded border border-line bg-panel overflow-hidden">
          {sale.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
              <div>
                <p className="font-medium text-ink">{item.product_name}</p>
                <p className="text-[11px] text-muted">
                  {item.sku} · {item.quantity} × {sale.currency_code} {item.unit_price.toFixed(2)}
                </p>
              </div>
              <span className="font-semibold text-ink">
                {sale.currency_code} {item.line_total.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {sale.refunds && sale.refunds.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-danger mb-1.5">Refund History:</h4>
          <div className="divide-y divide-line rounded border border-danger/30 bg-danger/5 overflow-hidden">
            {sale.refunds.map((r) => (
              <div key={r.id} className="p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{r.refund_no}</span>
                  <span className="font-bold text-danger">
                    -{sale.currency_code} {r.refund_amount.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-0.5">
                  Method: {r.payment_method} · Reason: {r.reason || "Return"} · Processed by {r.processed_by}
                </p>
                <div className="mt-1 text-[11px] text-muted">
                  Items:{" "}
                  {r.items
                    .map(
                      (ri) =>
                        `${ri.product_name} (${ri.quantity}x ${ri.restock_inventory ? "restocked" : "no restock"})`
                    )
                    .join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-1.5 text-xs">
        <SummaryRow label="Subtotal" value={sale.subtotal} currency={sale.currency_code} />
        {sale.discount > 0 && <SummaryRow label="Discount" value={-sale.discount} currency={sale.currency_code} />}
        <SummaryRow label={`Tax (${sale.tax_rate}%)`} value={sale.tax_amount} currency={sale.currency_code} />
        <div className="flex items-center justify-between border-t border-line pt-2 text-sm font-semibold text-ink">
          <span>Original Total</span>
          <span>
            {sale.currency_code} {sale.total.toFixed(2)}
          </span>
        </div>

        {totalRefundedAmount > 0 && (
          <div className="flex items-center justify-between text-sm font-semibold text-danger pt-1">
            <span>Total Refunded</span>
            <span>
              -{sale.currency_code} {totalRefundedAmount.toFixed(2)}
            </span>
          </div>
        )}

        {(sale.status === "completed" || sale.status === "partially_refunded") && (
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-muted">Net Profit</span>
            <span className="font-medium text-success">
              {sale.currency_code} {profit.toFixed(2)} ({marginPct.toFixed(1)}%)
            </span>
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] text-muted">Payment Method: {sale.payment_method}</p>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => printSale(sale)}>
          Print receipt
        </Button>
        {(sale.status === "completed" || sale.status === "partially_refunded") && (
          <Button variant="secondary" onClick={() => onOpenRefund(sale)}>
            Issue Refund
          </Button>
        )}
        {sale.status === "completed" && (
          <Button variant="danger" onClick={() => onVoid(sale)}>
            Void sale
          </Button>
        )}
      </div>
    </Modal>
  );
}

function SummaryRow({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="flex items-center justify-between text-muted">
      <span>{label}</span>
      <span className="text-ink">
        {currency} {value.toFixed(2)}
      </span>
    </div>
  );
}
