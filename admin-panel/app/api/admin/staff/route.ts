import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

/** GET /api/admin/staff — Lista el equipo */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  const res = await fetch(`${BACKEND}/api/admin/staff`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

/** POST /api/admin/staff — Registra nuevo usuario */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const token = request.cookies.get("admin_token")?.value;
  const res = await fetch(`${BACKEND}/api/admin/staff`, {
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

/** DELETE /api/admin/staff/:id — Borra usuario */
// Nota: Next.js App Router maneja el ID en el body o como parte de la URL si se usa un slug dinámico
// Pero aquí implementaremos una función DELETE que el frontend pueda llamar.
// Si el frontend llama a /api/admin/staff?id=... o detectamos el ID en la URL.
