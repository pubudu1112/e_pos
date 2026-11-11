import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ allowed: false }, { status: 401 });
  const allowed = await hasPermission("POS_PDF_COUNTER_ACCESS");
  return NextResponse.json({ allowed }, { status: allowed ? 200 : 403 });
}
