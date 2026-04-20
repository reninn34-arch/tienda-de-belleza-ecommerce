import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

/** GET /api/admin/inventory — Obtiene la lista unificada de productos y kits */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  
  const res = await fetch(`${BACKEND}/api/inventory`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    cache: "no-store"
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    return NextResponse.json({ error: errorText }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
