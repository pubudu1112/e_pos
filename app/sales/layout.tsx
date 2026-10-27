import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";

type SalesLayoutProps = {
  children: ReactNode;
};

export default function SalesLayout({
  children,
}: SalesLayoutProps) {
  return (
    <AppShell>
      {children}
    </AppShell>
  );
}