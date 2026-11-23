import { redirect } from "next/navigation";
import { Geist } from "next/font/google";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getStoredSettings } from "@/lib/settings";
import POSClient from "./POSClient";

const posFont = Geist({
  subsets: ["latin"],
  display: "swap",
});

export default async function POSPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowed = await hasPermission("POS_VIEW");
  if (!allowed) redirect("/access-denied?permission=POS_VIEW");

  const settings = await getStoredSettings();

  return (
    <div className={`${posFont.className} tabular-nums`}>
      <POSClient
        imageMode={settings.posDisplayMode === "IMAGE"}
        user={{
          username: session.user.username,
          fullName: session.user.fullName,
        }}
      />
    </div>
  );
}
