import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import ExpensesClient from "./ExpensesClient";

export default async function ExpensesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await hasPermission("EXPENSE_VIEW");

  if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
    redirect("/access-denied?permission=EXPENSE_VIEW");
  }

  return (
    <AppShell>
      <ExpensesClient />
    </AppShell>
  );
}
