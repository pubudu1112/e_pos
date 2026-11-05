import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import JobsClient from "./JobsClient";

export default async function JobsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await hasPermission("JOB_VIEW");

  if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
    redirect("/access-denied?permission=JOB_VIEW");
  }

  return (
    <AppShell>
      <JobsClient />
    </AppShell>
  );
}
