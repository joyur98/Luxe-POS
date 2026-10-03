import { useState } from "react";
import { Card, CardHeader, Badge } from "@/components/ui/Surfaces";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Surfaces";
import { useCurrency } from "@/context/CurrencyContext";
import { api } from "@/lib/api";
import type { Currency } from "@/types";

const emptyCurrency: Currency = { code: "", name: "", symbol: "", exchange_rate: 1, is_base: false };

export function CurrencySettings() {
  const { currencies, base, reload } = useCurrency();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Currency>(emptyCurrency);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditing(emptyCurrency);
    setFormOpen(true);
  }

  function openEdit(c: Currency) {
    setEditing(c);
    setFormOpen(true);
  }

  async function handleSave() {
    if (!editing.code.trim() || !editing.name.trim()) return;
    setSaving(true);
    try {
      await api.upsertCurrency({ ...editing, code: editing.code.toUpperCase() });
      await reload();
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Currency) {
    if (c.is_base) return;
    if (!confirm(`Remove ${c.code} from accepted currencies?`)) return;
    await api.deleteCurrency(c.code);
    reload();
  }

  async function handleSetBase(c: Currency) {
    if (c.is_base) return;
    if (!confirm(`Make ${c.code} the base currency? All product prices are stored in the base currency.`)) return;
    await api.setBaseCurrency(c.code);
    reload();
  }

  return (
    <Card>
      <CardHeader
        title="Currencies"
        subtitle={`Prices are stored in ${base?.code ?? "your base currency"}; other currencies convert using the rate below`}
        action={
          <Button size="sm" variant="secondary" onClick={openNew}>
            + Add currency
          </Button>
        }
      />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="px-5 py-3 font-medium">Code</th>
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-5 py-3 font-medium">Symbol</th>
            <th className="px-5 py-3 font-medium">Exchange rate (per 1 base)</th>
            <th className="px-5 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {currencies.map((c) => (
            <tr key={c.code} className="border-b border-line last:border-0">
              <td className="px-5 py-3 font-medium text-ink">
                {c.code} {c.is_base && <Badge tone="success">base</Badge>}
              </td>
              <td className="px-5 py-3 text-muted">{c.name}</td>
              <td className="px-5 py-3 text-muted">{c.symbol}</td>
              <td className="px-5 py-3 text-muted">{c.exchange_rate}</td>
              <td className="px-5 py-3 text-right">
                <button onClick={() => openEdit(c)} className="mr-3 text-xs font-medium text-accent hover:underline">
                  Edit
                </button>
                {!c.is_base && (
                  <>
                    <button
                      onClick={() => handleSetBase(c)}
                      className="mr-3 text-xs font-medium text-muted hover:text-ink hover:underline"
                    >
                      Set as base
                    </button>
                    <button onClick={() => handleDelete(c)} className="text-xs font-medium text-danger hover:underline">
                      Remove
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing.code ? "Edit currency" : "Add currency"} width="max-w-sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Code (e.g. NPR)">
              <Input
                value={editing.code}
                maxLength={6}
                onChange={(e) => setEditing((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                disabled={!!currencies.find((c) => c.code === editing.code)?.is_base}
              />
            </FieldGroup>
            <FieldGroup label="Symbol">
              <Input value={editing.symbol} onChange={(e) => setEditing((f) => ({ ...f, symbol: e.target.value }))} />
            </FieldGroup>
          </div>
          <FieldGroup label="Name">
            <Input value={editing.name} onChange={(e) => setEditing((f) => ({ ...f, name: e.target.value }))} />
          </FieldGroup>
          <FieldGroup label={`Exchange rate (1 ${base?.code ?? "base"} = ? ${editing.code || "this currency"})`}>
            <Input
              type="number"
              min={0}
              step="any"
              value={editing.exchange_rate}
              disabled={editing.is_base}
              onChange={(e) => setEditing((f) => ({ ...f, exchange_rate: Number(e.target.value) }))}
            />
          </FieldGroup>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save currency"}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
