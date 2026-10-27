import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import AppShell from "@/components/AppShell";
import PurchaseClient from "./PurchaseClient";

export default async function PurchasesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const canView = await hasPermission("PURCHASE_VIEW");

  if (!canView) {
    redirect("/access-denied?permission=PURCHASE_VIEW");
  }

  return (
    <AppShell>
      <PurchaseClient />
    </AppShell>
  );
}