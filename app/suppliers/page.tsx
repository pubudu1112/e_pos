import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import AppShell from "@/components/AppShell";
import SupplierClient from "./SupplierClient";

export default async function SuppliersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const canView = await hasPermission("SUPPLIER_VIEW");

  if (!canView) {
    redirect("/access-denied?permission=SUPPLIER_VIEW");
  }

  return (
    <AppShell>
      <SupplierClient />
    </AppShell>
  );
}