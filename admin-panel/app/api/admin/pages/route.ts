import { NextRequest, NextResponse } from "next/server";
import { revalidateStore } from "@/lib/revalidate";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

/** GET /api/admin/pages — Lista páginas */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  const res = await fetch(`${BACKEND}/api/pages`, { 
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    cache: "no-store" 
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

/** POST /api/admin/pages — Crea/Actualiza página */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const token = request.cookies.get("admin_token")?.value;
  const res = await fetch(`${BACKEND}/api/pages`, {
    method: "POST",
    headers: { 
      Authorization: token ? `Bearer ${token}` : "", 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.ok) await revalidateStore("pages");
  return NextResponse.json(data, { status: res.status });
}
