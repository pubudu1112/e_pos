import { ShieldAlert } from "lucide-react";
import BackButton from "./BackButton";

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{
    permission?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-8 w-8" />
          </div>

          {/* Title */}
          <h1 className="mt-6 text-2xl font-bold text-foreground">
            Access Denied
          </h1>

          {/* Description */}
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            You do not have permission to access this page.
          </p>

          {/* Required Permission */}
          {params.permission && (
            <div className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Required Permission
              </p>

              <p className="mt-1 text-sm font-semibold text-foreground">
                {params.permission}
              </p>
            </div>
          )}

          {/* Back Button */}
          <div className="mt-6">
            <BackButton />
          </div>
        </div>
      </div>
    </main>
  );
}