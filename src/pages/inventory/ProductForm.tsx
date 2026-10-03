import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Surfaces";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input } from "@/components/ui/Field";
import type { Product } from "@/types";
import { api } from "@/lib/api";

interface Props {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

const empty: Product = {
  id: null,
  sku: "",
  name: "",
  category: "",
  brand: "",
  size: "",
  color: "",
  material: "",
  cost_price: 0,
  sale_price: 0,
  quantity: 0,
  reorder_level: 3,
  image_path: null,
  is_active: true,
  created_at: null,
  updated_at: null,
};

export function ProductForm({ open, product, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Product>(empty);
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(product ?? empty);
      setError(null);
      api.listCategories().then(setCategories);
    }
  }, [open, product]);

  function update<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.sku.trim() || !form.name.trim()) {
      setError("SKU and name are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (form.category && !categories.includes(form.category)) {
        await api.createCategory(form.category);
      }
      if (form.id) {
        await api.updateProduct(form);
      } else {
        await api.createProduct(form);
      }
      onSaved();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={form.id ? "Edit product" : "Add product"} width="max-w-xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="SKU">
            <Input value={form.sku} onChange={(e) => update("sku", e.target.value)} placeholder="CW-1001" />
          </FieldGroup>
          <FieldGroup label="Product name">
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Cashmere Wrap Coat" />
          </FieldGroup>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Category">
            <Input
              list="category-options"
              value={form.category ?? ""}
              onChange={(e) => update("category", e.target.value)}
              placeholder="Outerwear"
            />
            <datalist id="category-options">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </FieldGroup>
          <FieldGroup label="Brand">
            <Input value={form.brand ?? ""} onChange={(e) => update("brand", e.target.value)} />
          </FieldGroup>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <FieldGroup label="Size">
            <Input value={form.size ?? ""} onChange={(e) => update("size", e.target.value)} placeholder="M" />
          </FieldGroup>
          <FieldGroup label="Color">
            <Input value={form.color ?? ""} onChange={(e) => update("color", e.target.value)} placeholder="Camel" />
          </FieldGroup>
          <FieldGroup label="Material">
            <Input value={form.material ?? ""} onChange={(e) => update("material", e.target.value)} placeholder="Cashmere" />
          </FieldGroup>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Cost price (base currency)">
            <Input
              type="number"
              min={0}
              value={form.cost_price}
              onChange={(e) => update("cost_price", Number(e.target.value))}
            />
          </FieldGroup>
          <FieldGroup label="Sale price (base currency)">
            <Input
              type="number"
              min={0}
              value={form.sale_price}
              onChange={(e) => update("sale_price", Number(e.target.value))}
            />
          </FieldGroup>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Quantity in stock">
            <Input
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => update("quantity", Number(e.target.value))}
            />
          </FieldGroup>
          <FieldGroup label="Reorder level">
            <Input
              type="number"
              min={0}
              value={form.reorder_level}
              onChange={(e) => update("reorder_level", Number(e.target.value))}
            />
          </FieldGroup>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : "Save product"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
