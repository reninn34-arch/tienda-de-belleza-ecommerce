import { NextRequest, NextResponse } from "next/server";
import { revalidateStore } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

/** GET /api/admin/settings — Obtener configuración */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("admin_token")?.value;
    const res = await fetch(`${BACKEND}/api/settings`, { 
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      cache: "no-store" 
    });
    if (!res.ok) return NextResponse.json({ error: "Backend error" }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("GET /api/admin/settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** PUT /api/admin/settings — Actualizar configuración */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const token = request.cookies.get("admin_token")?.value;
    const res = await fetch(`${BACKEND}/api/settings`, {
      method: "PUT",
      headers: { 
        Authorization: token ? `Bearer ${token}` : "", 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return NextResponse.json({ error: "Backend error" }, { status: res.status });
    const data = await res.json();
    if (res.ok) revalidateStore("settings");
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("PUT /api/admin/settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
