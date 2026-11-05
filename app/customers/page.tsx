import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import CustomersClient from "./CustomersClient";

export default async function CustomersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await hasPermission("CUSTOMER_VIEW");

  if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
    redirect("/access-denied?permission=CUSTOMER_VIEW");
  }

  return (
    <AppShell>
      <CustomersClient />
    </AppShell>
  );
}
