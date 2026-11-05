import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import SalesReportClient from "./SalesReportClient";

export default async function SalesReportPage() {
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
      <SalesReportClient />
    </AppShell>
  );
}
