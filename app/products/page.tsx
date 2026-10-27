import { redirect } from "next/navigation";

import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

import ProductsClient from "./ProductsClient";

export default async function ProductsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await hasPermission("PRODUCT_VIEW");

  if (!allowed) {
    redirect("/access-denied?permission=PRODUCT_VIEW");
  }

  return (
    <AppShell>
      <ProductsClient />
    </AppShell>
  );
}