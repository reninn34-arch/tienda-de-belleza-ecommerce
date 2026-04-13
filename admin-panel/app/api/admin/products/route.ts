import { NextRequest, NextResponse } from "next/server";
import { revalidateStore } from "@/lib/revalidate";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

/** GET /api/admin/products — Lista productos filtrada por identificación en backend */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  const res = await fetch(`${BACKEND}/api/products`, { 
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    cache: "no-store" 
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

/** POST /api/admin/products — Crea producto */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const token = request.cookies.get("admin_token")?.value;
  const res = await fetch(`${BACKEND}/api/products`, {
    method: "POST",
    headers: { 
      Authorization: token ? `Bearer ${token}` : "", 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.ok) await revalidateStore("products");
  return NextResponse.json(data, { status: res.status });
}
