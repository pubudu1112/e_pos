import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await hasPermission("DASHBOARD_VIEW");

  if (!allowed) {
    redirect("/access-denied?permission=DASHBOARD_VIEW");
  }

  return <DashboardClient user={session.user} />;
}