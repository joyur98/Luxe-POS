import { useState } from "react";
import { Modal } from "@/components/ui/Surfaces";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import type { RefundInput, Sale } from "@/types";
import { PAYMENT_METHODS } from "@/types";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime } from "@/lib/format";

export function RefundModal({
  sale,
  onClose,
  onRefundSuccess,
}: {
  sale: Sale | null;
  onClose: () => void;
  onRefundSuccess: () => void;
}) {
  const { user } = useAuth();
  const [refundQuantities, setRefundQuantities] = useState<Record<number, number>>({});
  const [restockMap, setRestockMap] = useState<Record<number, boolean>>({});
  const [paymentMethod, setPaymentMethod] = useState<string>(sale?.payment_method || "Cash");
  const [reason, setReason] = useState("Customer Return / Size Exchange");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completedRefund, setCompletedRefund] = useState<{
    refund_no: string;
    refund_amount: number;
  } | null>(null);

  if (!sale) return null;

  // Calculate previously refunded quantities for each sale item
  const previousRefundedMap: Record<number, number> = {};
  if (sale.refunds) {
    for (const r of sale.refunds) {
      for (const item of r.items) {
        previousRefundedMap[item.sale_item_id] =
          (previousRefundedMap[item.sale_item_id] || 0) + item.quantity;
      }
    }
  }

  function getQty(itemId: number) {
    return refundQuantities[itemId] ?? 0;
  }

  function setQty(itemId: number, val: number, maxVal: number) {
    const clamped = Math.max(0, Math.min(val, maxVal));
    setRefundQuantities((prev) => ({ ...prev, [itemId]: clamped }));
  }

  function isRestocked(itemId: number) {
    return restockMap[itemId] ?? true; // default true ("everything goes back")
  }

  function toggleRestock(itemId: number) {
    setRestockMap((prev) => ({ ...prev, [itemId]: !(prev[itemId] ?? true) }));
  }

  // Calculate total refund amount
  const totalRefundAmount = sale.items.reduce((sum, item) => {
    const qty = getQty(item.id);
    return sum + item.unit_price * qty;
  }, 0);

  const hasItemsToRefund = totalRefundAmount > 0;

  async function handleProcessRefund() {
    if (!hasItemsToRefund) {
      setError("Please select at least 1 item quantity to refund.");
      return;
    }

    const itemsToRefund = sale!.items
      .filter((item) => getQty(item.id) > 0)
      .map((item) => ({
        sale_item_id: item.id,
        product_id: item.product_id,
        quantity: getQty(item.id),
        restock_inventory: isRestocked(item.id),
      }));

    const refundInput: RefundInput = {
      items: itemsToRefund,
      payment_method: paymentMethod,
      reason,
      processed_by: user?.full_name || "Staff",
    };

    setSubmitting(true);
    setError("");
    try {
      const res = await api.refundSale(sale!.id, refundInput);
      setCompletedRefund({
        refund_no: res.refund_no,
        refund_amount: res.refund_amount,
      });
      onRefundSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to process refund");
    } finally {
      setSubmitting(false);
    }
  }

  if (completedRefund) {
    return (
      <Modal open={true} onClose={onClose} title="Refund Receipt Issued" width="max-w-md">
        <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-success text-paper font-bold text-lg">
            ✓
          </div>
          <h3 className="font-medium text-success text-base">Refund Processed Successfully</h3>
          <p className="mt-1 text-xs text-muted">Receipt No: {completedRefund.refund_no}</p>
          <p className="mt-2 text-xl font-bold text-ink">
            {sale.currency_code} {completedRefund.refund_amount.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Returned stock has been restocked to inventory.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            Print Refund Voucher
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={true} onClose={onClose} title={`Process Refund — Invoice ${sale.invoice_no}`} width="max-w-xl">
      <div className="space-y-4">
        {error && (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="rounded bg-paper p-3 text-xs text-muted border border-line">
          <p className="font-semibold text-ink">Invoice Customer: {sale.customer_name || "Walk-in Customer"}</p>
          <p className="mt-0.5">Original Total: {sale.currency_code} {sale.total.toFixed(2)} · Paid via {sale.payment_method}</p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-ink mb-2">Select Items & Quantities to Return:</h4>
          <div className="divide-y divide-line rounded border border-line overflow-hidden max-h-60 overflow-y-auto">
            {sale.items.map((item) => {
              const prevRefunded = previousRefundedMap[item.id] || 0;
              const maxRefundable = item.quantity - prevRefunded;
              const currentQty = getQty(item.id);
              const restocked = isRestocked(item.id);

              return (
                <div key={item.id} className="p-3 text-xs bg-panel flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">{item.product_name}</p>
                    <p className="text-muted text-[11px]">
                      {item.sku} · Price: {sale.currency_code} {item.unit_price.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted mt-0.5">
                      Purchased: {item.quantity} {prevRefunded > 0 ? `(Prev Returned: ${prevRefunded})` : ""} · Max Returnable: {maxRefundable}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-muted">
                      <input
                        type="checkbox"
                        checked={restocked}
                        onChange={() => toggleRestock(item.id)}
                        className="rounded border-line text-ink focus:ring-accent"
                      />
                      <span>Restock item</span>
                    </label>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={currentQty <= 0 || maxRefundable <= 0}
                        onClick={() => setQty(item.id, currentQty - 1, maxRefundable)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-line bg-paper text-ink disabled:opacity-30"
                      >
                        -
                      </button>
                      <span className="w-7 text-center font-semibold text-sm text-ink">{currentQty}</span>
                      <button
                        type="button"
                        disabled={currentQty >= maxRefundable || maxRefundable <= 0}
                        onClick={() => setQty(item.id, currentQty + 1, maxRefundable)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-line bg-paper text-ink disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Refund Method</label>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full text-xs"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Reason for Refund</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for return"
              className="w-full text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line pt-4 text-sm">
          <span className="text-muted font-medium">Refund Subtotal:</span>
          <span className="text-lg font-bold text-ink">
            {sale.currency_code} {totalRefundAmount.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!hasItemsToRefund || submitting}
            onClick={handleProcessRefund}
          >
            {submitting ? "Processing…" : "Confirm Refund & Restock"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
