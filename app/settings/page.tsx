import Link from "next/link";
import {
  Settings,
  Users,
  ShieldCheck,
  FileText,
  ChevronRight,
} from "lucide-react";

const settingsItems = [
  {
    title: "General Settings",
    description:
      "Manage general system configuration and preferences.",
    icon: Settings,
    href: "/settings/general",
  },
  {
    title: "Users",
    description:
      "View and manage users who can access the system.",
    icon: Users,
    href: "/settings/users",
  },
  {
    title: "Roles & Permissions",
    description:
      "Manage roles and control which tasks each role can access.",
    icon: ShieldCheck,
    href: "/settings/permissions",
    highlight: true,
  },
  {
    title: "Audit Logs",
    description:
      "View system activities and user actions.",
    icon: FileText,
    href: "/reports/activity",
  },
];

export default function SettingsPage() {
  return (
    <div className="min-h-full p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Settings className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Settings
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Manage your system configuration and access settings.
              </p>
            </div>
          </div>
        </div>

        {/* Settings Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {settingsItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                className="group"
              >
                <div
                  className={`rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    item.highlight
                      ? "border-primary/30 ring-1 ring-primary/10"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          item.highlight
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="font-semibold text-foreground">
                          {item.title}
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Access Control Information */}
        <div className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-semibold text-foreground">
                Role-Based Access Control
              </h3>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Permissions are assigned to roles. Only authorized
                administrators can change role permissions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}