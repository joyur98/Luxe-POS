import type { Currency } from "@/types";

export function formatMoney(amount: number, currency?: Currency | null): string {
  const symbol = currency?.symbol ?? "";
  const value = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${value}`.trim();
}

export function convert(baseAmount: number, currency?: Currency | null): number {
  if (!currency) return baseAmount;
  return baseAmount * currency.exchange_rate;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayIso(): string {
  return new Date().toISOString();
}
