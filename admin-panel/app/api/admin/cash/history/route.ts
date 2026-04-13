import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function GET(request: NextRequest) {
  const branchId = request.nextUrl.searchParams.get("branchId") || "";
  const limit = request.nextUrl.searchParams.get("limit") || "20";
  const token = request.cookies.get("admin_token")?.value;
  
  const res = await fetch(`${BACKEND}/api/admin/cash/history?branchId=${branchId}&limit=${limit}`, {
    headers: { Authorization: token ? `Bearer ${token}` : "" },
    cache: "no-store"
  });
  
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
