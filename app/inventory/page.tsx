import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import InventoryClient from "./InventoryClient";

export default async function InventoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await hasPermission("INVENTORY_VIEW"))) {
    redirect("/access-denied?permission=INVENTORY_VIEW");
  }

  return (
    <AppShell>
      <InventoryClient />
    </AppShell>
  );
}
