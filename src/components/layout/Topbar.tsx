import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
import { Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Surfaces";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { currencies, selected, setSelectedCode } = useCurrency();
  const { user, logout } = useAuth();

  const roleTone =
    user?.role === "admin" ? "danger" : user?.role === "manager" ? "accent" : "success";

  return (
    <header className="flex items-center justify-between border-b border-line bg-paper px-8 py-5">
      <div>
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Currency</span>
          <Select
            className="w-36"
            value={selected?.code ?? ""}
            onChange={(e) => setSelectedCode(e.target.value)}
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.symbol}
              </option>
            ))}
          </Select>
        </div>

        {user && (
          <div className="flex items-center gap-3 border-l border-line pl-5">
            <div className="text-right">
              <p className="text-xs font-semibold text-ink">{user.full_name}</p>
              <div className="mt-0.5 flex justify-end">
                <Badge tone={roleTone as any}>{user.role.toUpperCase()}</Badge>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-md border border-line bg-panel p-2 text-xs font-medium text-muted hover:border-danger/40 hover:text-danger"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
