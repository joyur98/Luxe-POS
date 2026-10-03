import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { ProductGrid } from "./ProductGrid";
import { CartPanel } from "./CartPanel";
import { CheckoutModal } from "./CheckoutModal";
import { ReceiptModal } from "./ReceiptModal";
import type { CartLine } from "./cartTypes";
import type { Product, Sale } from "@/types";

export function Pos() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  function addProduct(product: Product) {
    if (!product.id || product.quantity <= 0) return;
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id as number,
          name: product.name,
          sku: product.sku,
          basePrice: product.sale_price,
          quantity: 1,
          discount: 0,
          maxQuantity: product.quantity,
        },
      ];
    });
  }

  function setQuantity(productId: number, quantity: number) {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(quantity, l.maxQuantity) } : l)),
    );
  }

  function removeLine(productId: number) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  function handleComplete(sale: Sale) {
    setCheckoutOpen(false);
    setCompletedSale(sale);
    setLines([]);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar title="Point of Sale" subtitle="Build a sale and take payment" />
      <div className="flex flex-1 overflow-hidden">
        <div className="min-w-0 flex-1">
          <ProductGrid onAdd={addProduct} />
        </div>
        <CartPanel
          lines={lines}
          onQuantity={setQuantity}
          onRemove={removeLine}
          onClear={() => setLines([])}
          onCheckout={() => setCheckoutOpen(true)}
        />
      </div>

      <CheckoutModal
        open={checkoutOpen}
        lines={lines}
        onClose={() => setCheckoutOpen(false)}
        onComplete={handleComplete}
      />
      <ReceiptModal sale={completedSale} onClose={() => setCompletedSale(null)} />
    </div>
  );
}
