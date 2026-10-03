import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Surfaces";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input } from "@/components/ui/Field";
import { api } from "@/lib/api";

export function StoreSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    api.getSettings().then(setSettings);
  }, []);

  function update(key: string, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(settings).map(([key, value]) => api.updateSetting(key, value)),
      );
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Store details" subtitle="Shown on receipts and used for invoice numbering" />
      <div className="grid grid-cols-2 gap-4 px-5 py-5">
        <FieldGroup label="Store name">
          <Input value={settings.store_name ?? ""} onChange={(e) => update("store_name", e.target.value)} />
        </FieldGroup>
        <FieldGroup label="Phone">
          <Input value={settings.store_phone ?? ""} onChange={(e) => update("store_phone", e.target.value)} />
        </FieldGroup>
        <FieldGroup label="Address">
          <Input value={settings.store_address ?? ""} onChange={(e) => update("store_address", e.target.value)} />
        </FieldGroup>
        <FieldGroup label="Default tax rate (%)">
          <Input
            type="number"
            min={0}
            value={settings.tax_rate ?? "0"}
            onChange={(e) => update("tax_rate", e.target.value)}
          />
        </FieldGroup>
        <FieldGroup label="Invoice prefix">
          <Input value={settings.invoice_prefix ?? ""} onChange={(e) => update("invoice_prefix", e.target.value)} />
        </FieldGroup>
        <FieldGroup label="Next invoice number">
          <Input
            type="number"
            min={1}
            value={settings.next_invoice_number ?? "1001"}
            onChange={(e) => update("next_invoice_number", e.target.value)}
          />
        </FieldGroup>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-4">
        {savedAt && <span className="text-xs text-muted">Saved</span>}
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Card>
  );
}
