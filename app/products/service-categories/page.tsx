import { redirect } from "next/navigation";

import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

import ServiceCategoriesClient from "../ServiceCategoriesClient";

export default async function ServiceCategoriesPage() {
  const session = await getSession();

  // Login වෙලා නැත්නම් Login page එකට යවන්න
  if (!session) {
    redirect("/login");
  }

  // Service Category බලන්න permission එක තියෙනවද බලන්න
  const allowed = await hasPermission(
    "SERVICE_CATEGORY_VIEW"
  );

  // Permission නැත්නම් Access Denied page එකට යවන්න
  if (!allowed) {
    redirect(
      "/access-denied?permission=SERVICE_CATEGORY_VIEW"
    );
  }

  return (
    <AppShell>
      <ServiceCategoriesClient />
    </AppShell>
  );
}