import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

/** PATCH /api/admin/staff/[id]/status — Alternar estado activo */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const token = request.cookies.get("admin_token")?.value;
  
  const res = await fetch(`${BACKEND}/api/admin/staff/${id}/status`, {
    method: "PATCH",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
