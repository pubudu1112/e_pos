import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import ActivityLogsClient from "./ActivityLogsClient";

export default async function ActivityLogsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await hasPermission("REPORT_ACTIVITY_VIEW");

  if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
    redirect("/access-denied?permission=REPORT_ACTIVITY_VIEW");
  }

  return (
    <AppShell>
      <ActivityLogsClient />
    </AppShell>
  );
}

