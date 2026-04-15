import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // 1. Extraemos la cookie que tu proxy de login ya está guardando
  const token = request.cookies.get('admin_token')?.value;
  const { pathname } = request.nextUrl;

  // 2. Si el usuario intenta entrar a cualquier vista del panel (excepto el login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // Si no hay token en las cookies, lo pateamos al login antes de que cargue la pantalla
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // 3. Si tiene token, o si es una ruta del proxy (/api/...), dejamos que pase normalmente
  return NextResponse.next();
}

// ESTA ES LA MAGIA QUE PROTEGE TU PROXY
export const config = {
  matcher: [
    /*
     * Matcher ignora automáticamente todas las rutas que empiecen con /api/
     * También ignora archivos estáticos (_next/static, favicon, imágenes)
     * Solo se ejecutará cuando se navegue por las pantallas visuales.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
