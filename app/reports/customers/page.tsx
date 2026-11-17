import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import CustomerReportClient from "./CustomerReportClient";

export default async function CustomerReportPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await hasPermission("REPORT_SALES_VIEW");

  if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
    redirect("/access-denied?permission=REPORT_SALES_VIEW");
  }

  return (
    <AppShell>
      <CustomerReportClient />
    </AppShell>
  );
}
