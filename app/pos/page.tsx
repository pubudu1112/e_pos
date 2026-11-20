import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import POSClient from "./POSClient";

export default async function POSPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowed = await hasPermission("POS_VIEW");
  if (!allowed) redirect("/access-denied?permission=POS_VIEW");

  return <POSClient />;
}
