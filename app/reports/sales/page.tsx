import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import SalesReportClient from "./SalesReportClient";

export default async function SalesReportPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!(await hasPermission("REPORT_SALES_VIEW"))) {
    redirect("/access-denied?permission=REPORT_SALES_VIEW");
  }

  return <SalesReportClient />;
}
