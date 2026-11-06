import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import WarrantyClient from "./WarrantyClient";

export default async function WarrantyPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed =
    (await hasPermission("POS_VIEW")) ||
    session.user.role.name === "SUPER_ADMIN" ||
    session.user.role.name === "ADMIN";

  if (!allowed) {
    redirect("/access-denied?permission=POS_VIEW");
  }

  return (
    <AppShell>
      <WarrantyClient />
    </AppShell>
  );
}

