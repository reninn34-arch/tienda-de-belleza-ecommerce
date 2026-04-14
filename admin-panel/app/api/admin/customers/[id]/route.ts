import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get("admin_token")?.value;
  const { id } = await params;
  
  const res = await fetch(`${BACKEND}/api/admin/customers/${id}`, { 
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    cache: "no-store" 
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const token = request.cookies.get("admin_token")?.value;
  
  const res = await fetch(`${BACKEND}/api/admin/customers/${id}`, {
    method: "PUT",
    headers: { 
      Authorization: token ? `Bearer ${token}` : "", 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
