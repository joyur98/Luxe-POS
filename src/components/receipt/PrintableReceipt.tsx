import type { Sale } from "@/types";
import { formatDateTime } from "@/lib/format";

interface Props {
  sale: Sale;
  store: Record<string, string>;
}

// Rendered off-screen at all times; only made visible by the print
// stylesheet in index.css when window.print() is triggered from
// PrintContext. Uses plain numbers (no currency conversion) since a
// receipt should always show the exact currency and amounts a sale was
// actually recorded in.
export function PrintableReceipt({ sale, store }: Props) {
  const subtotal = sale.items.reduce((sum, i) => sum + i.unit_price * i.quantity - i.discount, 0);

  return (
    <div className="print-area font-sans text-black">
      <div className="mx-auto w-[300px] py-6 text-[13px] leading-snug">
        <div className="text-center">
          <p className="font-display text-lg font-semibold">{store.store_name || "Store"}</p>
          {store.store_address && <p className="text-[11px]">{store.store_address}</p>}
          {store.store_phone && <p className="text-[11px]">{store.store_phone}</p>}
        </div>

        <div className="my-3 border-t border-dashed border-black" />

        <div className="flex justify-between">
          <span>Invoice</span>
          <span className="font-medium">{sale.invoice_no}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span>{formatDateTime(sale.created_at)}</span>
        </div>
        <div className="flex justify-between">
          <span>Customer</span>
          <span>{sale.customer_name || "Walk-in"}</span>
        </div>

        <div className="my-3 border-t border-dashed border-black" />

        {sale.items.map((item) => (
          <div key={item.id} className="mb-1.5">
            <div className="flex justify-between">
              <span>{item.product_name}</span>
              <span>{item.line_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-neutral-600">
              <span>
                {item.sku} · {item.quantity} × {item.unit_price.toFixed(2)}
              </span>
            </div>
          </div>
        ))}

        <div className="my-3 border-t border-dashed border-black" />

        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount</span>
          <span>− {sale.discount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax ({sale.tax_rate}%)</span>
          <span>{sale.tax_amount.toFixed(2)}</span>
        </div>

        <div className="my-3 border-t border-dashed border-black" />

        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>
            {sale.currency_code} {sale.total.toFixed(2)}
          </span>
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-neutral-600">
          <span>Payment method</span>
          <span>{sale.payment_method}</span>
        </div>

        <div className="my-3 border-t border-dashed border-black" />

        <p className="text-center text-[11px]">Thank you for shopping with us.</p>
      </div>
    </div>
  );
}
