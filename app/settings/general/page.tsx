import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import GeneralSettingsClient from "./GeneralSettingsClient";

export default async function GeneralSettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await hasPermission("SETTINGS_VIEW");

  if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
    redirect("/access-denied?permission=SETTINGS_VIEW");
  }

  return <GeneralSettingsClient />;
}
