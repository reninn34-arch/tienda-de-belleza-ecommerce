import { NextRequest } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  
  try {
    const res = await fetch(`${BACKEND}/api/admin/events`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        Accept: "text/event-stream"
      },
      cache: "no-store",
    });

    if (!res.ok || !res.body) {
      return new Response("Error connecting to event stream", { status: res.status || 500 });
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });
  } catch (error) {
    return new Response("Internal Server Error", { status: 500 });
  }
}
