import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  // Validamos el secreto de seguridad
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tag = request.nextUrl.searchParams.get("tag");

  if (tag) {
    // Si nos pasan un tag (ej. "catalogo" o "producto-123"), borramos ese caché
    await revalidateTag(tag, {});
    return NextResponse.json({ revalidated: true, tag });
  }

  // Si no nos pasan tag, revalidamos todo el layout por defecto
  await revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true, message: "Full layout revalidated" });
}
