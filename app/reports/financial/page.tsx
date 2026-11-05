import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import FinancialReportsClient from "./FinancialReportsClient";

export default async function FinancialReportsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await hasPermission("REPORT_FINANCIAL_VIEW");

  if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
    redirect("/access-denied?permission=REPORT_FINANCIAL_VIEW");
  }

  return (
    <AppShell>
      <FinancialReportsClient />
    </AppShell>
  );
}

