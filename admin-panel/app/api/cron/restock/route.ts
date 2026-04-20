import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  // En producción, aquí verificarías el CRON_SECRET de Vercel
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }
  
  // Como estamos en el Next.js server component proxy, podemos usar el token admin o dejarlo abierto 
  // temporalmente porque es un webhook interno. Para efectos del sistema actual asumiendo SSE:
  
  // Forward request to Express Backend
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    
    // Obtener las cookies directamente para pasarlas al backend si hiciera falta autenticación, 
    // pero el endpoint cron normalmente no usa JWT de admin.
    const response = await fetch(`${backendUrl}/api/admin/purchases/cron/restock`, {
      method: "GET",
      // Si la ruta backend no está ignorada en auth middleware, necesitaríamos pasar token.
      // Modificamos index.ts para dejar pasar /api/admin/purchases/cron/restock
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: "Failed to trigger cron", details: errorText }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: "Connection to backend failed", details: error.message }, { status: 500 });
  }
}
