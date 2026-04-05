import { NextRequest, NextResponse } from "next/server";
import { revalidateStore } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function GET() {
  const res = await fetch(`${BACKEND}/api/settings`, { cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const res = await fetch(`${BACKEND}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.ok) revalidateStore("settings");
  return NextResponse.json(data, { status: res.status });
}
