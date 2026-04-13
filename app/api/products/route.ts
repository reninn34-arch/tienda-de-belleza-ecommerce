import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/products`, {
      // Revalidate frequently or bypass cache so the cart validation is accurate
      next: { revalidate: 0 } 
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch products" }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
