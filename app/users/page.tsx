import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await hasPermission("USER_VIEW");

  if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
    redirect("/access-denied?permission=USER_VIEW");
  }

  return (
    <AppShell>
      <UsersClient />
    </AppShell>
  );
}
