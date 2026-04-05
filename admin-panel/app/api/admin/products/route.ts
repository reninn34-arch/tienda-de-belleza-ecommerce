import { NextRequest, NextResponse } from "next/server";
import { revalidateStore } from "@/lib/revalidate";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function GET() {
  const res = await fetch(`${BACKEND}/api/products`, { cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await fetch(`${BACKEND}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.ok) revalidateStore("products");
  return NextResponse.json(data, { status: res.status });
}
