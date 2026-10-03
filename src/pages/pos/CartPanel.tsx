import { useMemo } from "react";
import type { CartLine } from "./cartTypes";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Surfaces";
import { useCurrency } from "@/context/CurrencyContext";
import { convert, formatMoney } from "@/lib/format";

interface Props {
  lines: CartLine[];
  onQuantity: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
  onClear: () => void;
  onCheckout: () => void;
}

export function CartPanel({ lines, onQuantity, onRemove, onClear, onCheckout }: Props) {
  const { selected } = useCurrency();

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + (l.basePrice * l.quantity - l.discount), 0),
    [lines],
  );

  return (
    <div className="flex h-full w-[360px] shrink-0 flex-col border-l border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h3 className="text-sm font-semibold text-ink">Current sale</h3>
        {lines.length > 0 && (
          <button onClick={onClear} className="text-xs text-muted hover:text-danger">
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <EmptyState title="Cart is empty" hint="Tap a product to add it" />
        ) : (
          <ul className="divide-y divide-line">
            {lines.map((l) => (
              <li key={l.productId} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{l.name}</p>
                    <p className="text-xs text-muted">{l.sku}</p>
                  </div>
                  <button
                    onClick={() => onRemove(l.productId)}
                    className="shrink-0 text-xs text-muted hover:text-danger"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center rounded border border-line">
                    <button
                      className="px-2 py-1 text-sm text-ink hover:bg-line/40"
                      onClick={() => onQuantity(l.productId, l.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{l.quantity}</span>
                    <button
                      className="px-2 py-1 text-sm text-ink hover:bg-line/40 disabled:opacity-30"
                      disabled={l.quantity >= l.maxQuantity}
                      onClick={() => onQuantity(l.productId, l.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm font-medium text-ink">
                    {formatMoney(convert(l.basePrice * l.quantity - l.discount, selected), selected)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-line px-5 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span className="font-medium text-ink">{formatMoney(convert(subtotal, selected), selected)}</span>
        </div>
        <Button
          variant="primary"
          className="mt-3 w-full"
          disabled={lines.length === 0}
          onClick={onCheckout}
        >
          Charge {formatMoney(convert(subtotal, selected), selected)}
        </Button>
      </div>
    </div>
  );
}
