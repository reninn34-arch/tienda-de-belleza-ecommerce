import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const token = request.cookies.get("admin_token")?.value;
  
  const res = await fetch(`${BACKEND}/api/admin/cash/open`, {
    method: "POST",
    headers: { 
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
