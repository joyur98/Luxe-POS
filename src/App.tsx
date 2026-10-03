import { Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/pages/dashboard/Dashboard";
import { Pos } from "@/pages/pos/Pos";
import { Inventory } from "@/pages/inventory/Inventory";
import { Sales } from "@/pages/sales/Sales";
import { Settings } from "@/pages/settings/Settings";
import { LoginPage } from "@/pages/auth/LoginPage";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { PrintProvider } from "@/context/PrintContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function AuthenticatedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-paper text-ink">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent" />
          <p className="text-xs font-medium text-muted">Connecting to Luxe POS Terminal…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const defaultPath = user.role === "cashier" ? "/pos" : "/";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper text-ink">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Routes>
          <Route
            path="/"
            element={
              user.role === "cashier" ? <Navigate to="/pos" replace /> : <Dashboard />
            }
          />
          <Route path="/pos" element={<Pos />} />
          <Route
            path="/inventory"
            element={
              user.role === "cashier" ? <Navigate to="/pos" replace /> : <Inventory />
            }
          />
          <Route path="/sales" element={<Sales />} />
          <Route
            path="/settings"
            element={
              user.role !== "admin" ? <Navigate to={defaultPath} replace /> : <Settings />
            }
          />
          <Route path="*" element={<Navigate to={defaultPath} replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <PrintProvider>
          <AuthenticatedApp />
        </PrintProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}
