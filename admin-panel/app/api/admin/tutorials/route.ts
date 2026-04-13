import { NextRequest, NextResponse } from "next/server";
import { revalidateStore } from "@/lib/revalidate";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

/** GET /api/admin/tutorials — Lista tutoriales */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  const res = await fetch(`${BACKEND}/api/tutorials`, { 
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    cache: "no-store" 
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

/** PUT /api/admin/tutorials — Actualiza tutoriales */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const token = request.cookies.get("admin_token")?.value;
  const res = await fetch(`${BACKEND}/api/tutorials`, {
    method: "PUT",
    headers: { 
      Authorization: token ? `Bearer ${token}` : "", 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.ok) await revalidateStore("tutorials");
  return NextResponse.json(data, { status: res.status });
}
