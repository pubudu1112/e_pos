import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import AppShellClient from "@/components/AppShellClient";

type AppShellProps = {
  children: React.ReactNode;
};

export default async function AppShell({
  children,
}: AppShellProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = session.user;

  async function logoutAction() {
    "use server";

    const currentSession = await getSession();

    if (currentSession) {
      await prisma.auditLog.create({
        data: {
          userId: currentSession.user.id,
          action: "LOGOUT",
          entity: "User",
          entityId: currentSession.user.id.toString(),
          details: JSON.stringify({
            username: currentSession.user.username,
            role: currentSession.user.role.name,
          }),
        },
      });
    }

    const { destroySession } = await import(
      "@/lib/auth/session"
    );

    await destroySession();

    redirect("/login");
  }

  return (
    <AppShellClient user={user} logoutAction={logoutAction}>
      {children}
    </AppShellClient>
  );
}