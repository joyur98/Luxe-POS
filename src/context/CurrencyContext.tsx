import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Currency } from "@/types";
import { api } from "@/lib/api";

interface CurrencyContextValue {
  currencies: Currency[];
  selected: Currency | null;
  setSelectedCode: (code: string) => void;
  base: Currency | null;
  reload: () => Promise<void>;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>(() => localStorage.getItem("luxe-pos-currency") ?? "");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listCurrencies();
      setCurrencies(list);
      if (!selectedCode || !list.some((c) => c.code === selectedCode)) {
        const base = list.find((c) => c.is_base) ?? list[0];
        if (base) setSelectedCode(base.code);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (selectedCode) localStorage.setItem("luxe-pos-currency", selectedCode);
  }, [selectedCode]);

  const selected = useMemo(
    () => currencies.find((c) => c.code === selectedCode) ?? currencies[0] ?? null,
    [currencies, selectedCode],
  );
  const base = useMemo(() => currencies.find((c) => c.is_base) ?? null, [currencies]);

  return (
    <CurrencyContext.Provider value={{ currencies, selected, setSelectedCode, base, reload, loading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
