import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Sale } from "@/types";
import { api } from "@/lib/api";
import { PrintableReceipt } from "@/components/receipt/PrintableReceipt";

interface PrintContextValue {
  printSale: (sale: Sale) => void;
}

const PrintContext = createContext<PrintContextValue | null>(null);

export function PrintProvider({ children }: { children: React.ReactNode }) {
  const [pendingSale, setPendingSale] = useState<Sale | null>(null);
  const [store, setStore] = useState<Record<string, string>>({});

  useEffect(() => {
    api.getSettings().then(setStore);
  }, []);

  const printSale = useCallback((sale: Sale) => {
    setPendingSale(sale);
  }, []);

  useEffect(() => {
    if (!pendingSale) return;
    const timer = setTimeout(() => window.print(), 60);
    const handleAfterPrint = () => setPendingSale(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [pendingSale]);

  return (
    <PrintContext.Provider value={{ printSale }}>
      {children}
      {pendingSale && <PrintableReceipt sale={pendingSale} store={store} />}
    </PrintContext.Provider>
  );
}

export function usePrint() {
  const ctx = useContext(PrintContext);
  if (!ctx) throw new Error("usePrint must be used within PrintProvider");
  return ctx;
}
