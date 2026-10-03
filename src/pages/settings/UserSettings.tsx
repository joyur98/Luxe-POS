import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/types";
import { Card, CardHeader, Badge, Modal } from "@/components/ui/Surfaces";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input } from "@/components/ui/Field";

const ROLES = ["admin", "manager", "cashier"] as const;
type Role = (typeof ROLES)[number];

const roleTone = (r: string) =>
  r === "admin" ? "danger" : r === "manager" ? "warn" : "neutral";

const emptyForm = () => ({
  username: "",
  full_name: "",
  role: "cashier" as Role,
  password: "",
  is_active: true,
});

export function UserSettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setUsers(await api.listUsers());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError("");
    setModalOpen(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setForm({ 
        username: u.username, 
        full_name: u.full_name, 
        role: u.role as Role, 
        password: "pass123", 
        is_active: u.is_active ?? true 
    });
    setError("");
    setModalOpen(true);
}

  function set(k: string, v: unknown) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    if (!form.username.trim() || !form.full_name.trim()) {
      setError("Username and full name are required.");
      return;
    }
    if (!editing && !form.password) {
      setError("Password is required for new accounts.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.updateUser(editing.id!, { ...form });
      } else {
        await api.createUser({ ...form });
      }
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(u: User) {
    if (!confirm(`Deactivate ${u.full_name}? They won't be able to log in.`)) return;
    await api.updateUser(u.id!, { ...u, is_active: false });
    load();
  }

  async function handleActivate(u: User) {
    await api.updateUser(u.id!, { ...u, is_active: true });
    load();
  }

  return (
    <>
      <Card>
        <CardHeader
          title="User Accounts"
          subtitle="Manage who can log into Luxe POS and what they can access"
          action={
            <Button variant="primary" onClick={openCreate}>
              + Add user
            </Button>
          }
        />

        {loading ? (
          <div className="px-5 py-8 text-center text-xs text-muted">Loading users…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper/50">
                <th className="px-5 py-2.5 text-left text-xs font-medium text-muted">Full name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">Username</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">Role</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line/60 last:border-0 hover:bg-paper/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-ink">{u.full_name}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-3">
                    <Badge tone={roleTone(u.role)}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.is_active ? "success" : "neutral"}>
                      {u.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-xs text-accent-dark hover:underline"
                      >
                        Edit
                      </button>
                      {u.is_active ? (
                        <button
                          onClick={() => handleDeactivate(u)}
                          className="text-xs text-danger hover:underline"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(u)}
                          className="text-xs text-success hover:underline"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit — ${editing.full_name}` : "Add new user"}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Full name">
              <Input
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="e.g. Ram Sharma"
              />
            </FieldGroup>
            <FieldGroup label="Username">
              <Input
                value={form.username}
                onChange={(e) => set("username", e.target.value.toLowerCase().replace(/\s/g, ""))}
                placeholder="e.g. ram"
                disabled={!!editing}
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Role">
            <div className="flex gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => set("role", r)}
                  className={`flex-1 rounded border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    form.role === r
                      ? "border-accent-dark bg-accent-light text-accent-dark"
                      : "border-line text-muted hover:border-ink/30"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted">
              {form.role === "admin" && "Full access — settings, users, reports, POS"}
              {form.role === "manager" && "Dashboard, inventory, sales & POS. No user management."}
              {form.role === "cashier" && "Point of Sale and own sales history only."}
            </p>
          </FieldGroup>

          <FieldGroup label={editing ? "New password (leave blank to keep current)" : "Password"}>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder={editing ? "Leave blank to keep current" : "Set a password"}
            />
          </FieldGroup>

          {editing && (
            <FieldGroup label="Account status">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                  className="h-4 w-4 rounded border-line accent-ink"
                />
                <span className="text-ink">Active (can log in)</span>
              </label>
            </FieldGroup>
          )}

          {error && (
            <p className="rounded bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create account"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
