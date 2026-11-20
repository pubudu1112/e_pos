import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (await hasPermission("POS_VIEW")) redirect("/pos");
  if (await hasPermission("DASHBOARD_VIEW")) redirect("/dashboard");

  redirect("/access-denied");
}
