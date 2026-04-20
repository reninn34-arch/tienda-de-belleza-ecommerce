import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

type Params = { params: Promise<{ id: string }> };

/** GET /api/admin/bundles/[id] */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const token = request.cookies.get("admin_token")?.value;
  const res = await fetch(`${BACKEND}/api/admin/bundles/${id}`, {
    headers: { Authorization: token ? `Bearer ${token}` : "" },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

/** PUT /api/admin/bundles/[id] */
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const token = request.cookies.get("admin_token")?.value;
  const res = await fetch(`${BACKEND}/api/admin/bundles/${id}`, {
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

/** DELETE /api/admin/bundles/[id] */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const token = request.cookies.get("admin_token")?.value;
  const res = await fetch(`${BACKEND}/api/admin/bundles/${id}`, {
    method: "DELETE",
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
