import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import MovementHistoryClient from "./MovementHistoryClient";

export default async function MovementHistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await hasPermission("INVENTORY_VIEW_MOVEMENTS"))) {
    redirect("/access-denied?permission=INVENTORY_VIEW_MOVEMENTS");
  }

  return (
    <AppShell>
      <MovementHistoryClient />
    </AppShell>
  );
}
