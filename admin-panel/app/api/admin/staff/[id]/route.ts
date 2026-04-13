import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

/** DELETE /api/admin/staff/[id] — Elimina un usuario */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get("admin_token")?.value;
  const res = await fetch(`${BACKEND}/api/admin/staff/${params.id}`, {
    method: "DELETE",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

/** PUT /api/admin/staff/[id] — Actualiza un usuario */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const token = request.cookies.get("admin_token")?.value;
  const res = await fetch(`${BACKEND}/api/admin/staff/${params.id}`, {
    method: "PUT",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
