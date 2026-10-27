import { redirect } from "next/navigation";

import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

import ServicesClient from "./ServicesClient";

export default async function ServicesPage() {
  const session = await getSession();

  // Login වෙලා නැත්නම් Login page එකට යවන්න
  if (!session) {
    redirect("/login");
  }

  // Services බලන්න permission එක තියෙනවද බලන්න
  const allowed = await hasPermission(
    "SERVICE_VIEW"
  );

  // Permission නැත්නම් Access Denied page එකට යවන්න
  if (!allowed) {
    redirect(
      "/access-denied?permission=SERVICE_VIEW"
    );
  }

  return (
    <AppShell>
      <ServicesClient />
    </AppShell>
  );
}