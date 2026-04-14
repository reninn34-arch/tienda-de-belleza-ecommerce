import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId") ?? "";
  const category = searchParams.get("category") ?? "";

  const res = await fetch(`${BACKEND}/api/admin/expenses?branchId=${branchId}&category=${category}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  const body = await request.json();

  const res = await fetch(`${BACKEND}/api/admin/expenses`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
