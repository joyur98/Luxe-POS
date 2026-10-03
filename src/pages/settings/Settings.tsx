import { Topbar } from "@/components/layout/Topbar";
import { StoreSettings } from "./StoreSettings";
import { CurrencySettings } from "./CurrencySettings";
import { UserSettings } from "./UserSettings";

export function Settings() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar title="Settings" subtitle="Store details, currencies and user accounts" />
      <div className="flex-1 space-y-6 overflow-y-auto px-8 py-6">
        <StoreSettings />
        <UserSettings />
        <CurrencySettings />
      </div>
    </div>
  );
}
