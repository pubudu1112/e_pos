
import { redirect } from "next/navigation";

import AppShell from "@/components/AppShell";
import SmartForecastSection from "@/app/dashboard/components/SmartForecastSection";

import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export default async function SmartForecastPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await hasPermission("SMART_FORECAST_VIEW");

  if (!allowed) {
    redirect("/dashboard");
  }

  return (
    <AppShell>
      <SmartForecastSection />
    </AppShell>
  );
}
