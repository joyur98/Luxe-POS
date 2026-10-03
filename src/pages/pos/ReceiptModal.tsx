import { Modal } from "@/components/ui/Surfaces";
import { Button } from "@/components/ui/Button";
import type { Sale } from "@/types";
import { formatDateTime } from "@/lib/format";
import { usePrint } from "@/context/PrintContext";

export function ReceiptModal({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const { printSale } = usePrint();
  if (!sale) return null;
  return (
    <Modal open={!!sale} onClose={onClose} title="Sale complete" width="max-w-sm">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          ✓
        </div>
        <p className="mt-3 text-sm font-medium text-ink">Invoice {sale.invoice_no}</p>
        <p className="text-xs text-muted">{formatDateTime(sale.created_at)}</p>
      </div>

      <div className="mt-4 divide-y divide-line rounded border border-line">
        {sale.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="text-ink">
              {item.quantity} × {item.product_name}
            </span>
            <span className="text-muted">{item.line_total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-base font-semibold text-ink">
        <span>Total paid</span>
        <span>
          {sale.currency_code} {sale.total.toFixed(2)}
        </span>
      </div>
      <p className="mt-1 text-center text-xs text-muted">via {sale.payment_method}</p>

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => printSale(sale)}>
          Print receipt
        </Button>
        <Button variant="primary" className="flex-1" onClick={onClose}>
          New sale
        </Button>
      </div>
    </Modal>
  );
}
