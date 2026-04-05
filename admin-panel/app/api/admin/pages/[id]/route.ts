import { NextRequest, NextResponse } from "next/server";
import { revalidateStore } from "@/lib/revalidate";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${BACKEND}/api/pages/${id}`, { cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const res = await fetch(`${BACKEND}/api/pages/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.ok) revalidateStore("pages");
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${BACKEND}/api/pages/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (res.ok) revalidateStore("pages");
  return NextResponse.json(data, { status: res.status });
}
