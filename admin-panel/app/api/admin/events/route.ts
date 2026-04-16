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

    const reader = res.body.getReader();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            try {
              controller.enqueue(value);
            } catch (e) {
              break;
            }
          }
        } catch (err) {
          // Ignoramos errores de red
        } finally {
          try { controller.close(); } catch (e) {}
          reader.releaseLock();
        }
      },
      cancel() {
        reader.cancel().catch(() => {});
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform", 
        "Connection": "keep-alive",
        "Content-Encoding": "none"
      }
    });
  } catch (error) {
    return new Response("Internal Server Error", { status: 500 });
  }
}