import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: DashboardIcon, roles: ["admin", "manager"] },
  { to: "/pos", label: "Point of Sale", icon: PosIcon, roles: ["admin", "manager", "cashier"] },
  { to: "/inventory", label: "Inventory", icon: InventoryIcon, roles: ["admin", "manager"] },
  { to: "/sales", label: "Sales & Refunds", icon: SalesIcon, roles: ["admin", "manager", "cashier"] },
  { to: "/settings", label: "Settings", icon: SettingsIcon, roles: ["admin"] },
];

export function Sidebar() {
  const { user } = useAuth();
  const role = user?.role || "cashier";

  const allowedItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex items-center gap-2 px-5 py-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-ink text-paper">
          <span className="font-display text-base font-bold">L</span>
        </div>
        <div>
          <p className="font-display text-[15px] leading-none font-semibold text-ink">Luxe POS</p>
          <p className="mt-1 text-[11px] leading-none text-muted">Boutique retail</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {allowedItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors ${
                isActive ? "bg-accent-light text-accent-dark font-medium" : "text-ink/80 hover:bg-line/40"
              }`
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line px-5 py-4 text-[11px] text-muted">
        <p className="font-medium text-ink/70">Luxe POS v3.0</p>
        <p className="mt-0.5 text-[10px]">PostgreSQL Engine Connected</p>
      </div>
    </aside>
  );
}

function iconProps() {
  return { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6 };
}

function DashboardIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}
function PosIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="7" width="18" height="13" rx="1.5" />
      <path d="M8 7V5a4 4 0 0 1 8 0v2" />
      <path d="M7 12h10M7 16h6" />
    </svg>
  );
}
function InventoryIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M3 7l9-4 9 4-9 4-9-4Z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  );
}
function SalesIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 19h16" />
      <path d="M7 19V10M12 19V5M17 19v-7" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" />
    </svg>
  );
}
