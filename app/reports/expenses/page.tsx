import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import ExpenseReportClient from "./ExpenseReportClient";

export default async function ExpenseReportPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed =
    (await hasPermission("REPORT_SALES_VIEW")) ||
    (await hasPermission("REPORT_FINANCIAL_VIEW")) ||
    (await hasPermission("EXPENSE_VIEW"));

  if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
    redirect("/access-denied?permission=REPORT_SALES_VIEW");
  }

  return (
    <AppShell>
      <ExpenseReportClient />
    </AppShell>
  );
}
