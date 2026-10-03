import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(u: string, p: string) {
    setUsername(u);
    setPassword(p);
    setError("");
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-paper p-4 text-ink">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-line bg-panel shadow-2xl">
        <div className="border-b border-line bg-accent-light/30 px-8 py-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-ink text-paper shadow-lg">
            <span className="font-display text-2xl font-bold">L</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Luxe POS</h1>
          <p className="mt-1 text-xs text-muted">Boutique Retail & Inventory Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-8 py-6">
          {error && (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-2.5 text-xs text-danger">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Username</label>
            <Input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Password</label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full"
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full py-2.5 text-sm font-semibold">
            {submitting ? "Signing in…" : "Sign In to Terminal"}
          </Button>

          <div className="pt-4 text-center">
            <p className="text-[11px] font-medium text-muted">Quick Demo Accounts (Click to Fill):</p>
            <div className="mt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => fillDemo("admin", "admin123")}
                className="rounded border border-line bg-paper px-2.5 py-1 text-[11px] font-medium text-ink hover:border-accent"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemo("cashier", "cashier123")}
                className="rounded border border-line bg-paper px-2.5 py-1 text-[11px] font-medium text-ink hover:border-accent"
              >
                Cashier
              </button>
              <button
                type="button"
                onClick={() => fillDemo("manager", "manager123")}
                className="rounded border border-line bg-paper px-2.5 py-1 text-[11px] font-medium text-ink hover:border-accent"
              >
                Manager
              </button>
            </div>
          </div>
        </form>

        <div className="border-t border-line bg-paper px-6 py-3 text-center text-[10px] text-muted">
          PostgreSQL Database Connected · Luxe POS v3.0
        </div>
      </div>
    </div>
  );
}
