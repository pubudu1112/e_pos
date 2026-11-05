import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import ReportsOverviewClient from "./ReportsOverviewClient";

export default async function ReportsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell>
      <ReportsOverviewClient />
    </AppShell>
  );
}
