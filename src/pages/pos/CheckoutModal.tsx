import { useMemo, useState } from "react";
import type { CartLine } from "./cartTypes";
import { Modal } from "@/components/ui/Surfaces";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Select } from "@/components/ui/Field";
import { useCurrency } from "@/context/CurrencyContext";
import { formatMoney } from "@/lib/format";
import { PAYMENT_METHODS } from "@/types";
import { api } from "@/lib/api";
import type { Sale } from "@/types";

interface Props {
  open: boolean;
  lines: CartLine[];
  onClose: () => void;
  onComplete: (sale: Sale) => void;
}

export function CheckoutModal({ open, lines, onClose, onComplete }: Props) {
  const { selected } = useCurrency();
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotalBase = useMemo(
    () => lines.reduce((sum, l) => sum + (l.basePrice * l.quantity - l.discount), 0),
    [lines],
  );
  const rate = selected?.exchange_rate ?? 1;
  const subtotal = subtotalBase * rate;
  const taxable = Math.max(subtotal - discount, 0);
  const taxAmount = taxable * (taxRate / 100);
  const total = taxable + taxAmount;

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const sale = await api.createSale({
        customer_name: customerName || null,
        currency_code: selected.code,
        exchange_rate: rate,
        discount,
        tax_rate: taxRate,
        payment_method: paymentMethod,
        notes: null,
        items: lines.map((l) => ({
          product_id: l.productId,
          product_name: l.name,
          sku: l.sku,
          unit_price: l.basePrice * rate,
          quantity: l.quantity,
          discount: l.discount * rate,
        })),
      });
      onComplete(sale);
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Complete sale" width="max-w-md">
      <div className="space-y-4">
        <FieldGroup label="Customer name (optional)">
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in" />
        </FieldGroup>

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label={`Discount (${selected?.symbol ?? ""})`}>
            <Input
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </FieldGroup>
          <FieldGroup label="Tax rate (%)">
            <Input
              type="number"
              min={0}
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
            />
          </FieldGroup>
        </div>

        <FieldGroup label="Payment method">
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </FieldGroup>

        <div className="rounded border border-line bg-paper px-4 py-3 text-sm">
          <Row label="Subtotal" value={formatMoney(subtotal, selected)} />
          <Row label="Discount" value={`− ${formatMoney(discount, selected)}`} />
          <Row label={`Tax (${taxRate}%)`} value={formatMoney(taxAmount, selected)} />
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-base font-semibold text-ink">
            <span>Total</span>
            <span>{formatMoney(total, selected)}</span>
          </div>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Processing…" : `Confirm ${formatMoney(total, selected)}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-muted">
      <span>{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
