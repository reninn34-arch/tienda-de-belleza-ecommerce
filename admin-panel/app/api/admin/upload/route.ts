import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import sharp from "sharp"; // <-- Importamos sharp

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    jwt.verify(token, JWT_SECRET as string);
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const data = await request.formData();
  const file = data.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const allowedTypes = [
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "video/mp4", "video/webm", "video/quicktime", "video/ogg", "video/avi",
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
  }

  const isVideo = file.type.startsWith("video/");
  const maxSize = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024; // 100MB video / 5MB image
  if (file.size > maxSize) {
    return NextResponse.json({ error: isVideo ? "Video demasiado grande (máx 100 MB)" : "Imagen demasiado grande (máx 5 MB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  if (isVideo) {
    // Si es video, no usamos sharp, lo pasamos directo a Base64
    const base64 = buffer.toString("base64");
    const url = `data:${file.type};base64,${base64}`;
    return NextResponse.json({ url });
  }

  try {
    // AQUÍ ES DONDE SHARP HACE LA MAGIA
    const optimizedBuffer = await sharp(buffer)
      .resize(1200, 1200, { // Máximo 1200x1200px
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 }) // Lo convertimos a WebP con 80% de calidad
      .toBuffer();

    // Convertimos el buffer YA OPTIMIZADO a Base64
    const base64 = optimizedBuffer.toString("base64");
    const url = `data:image/webp;base64,${base64}`;

    return NextResponse.json({ url });

  } catch (error) {
    console.error("Error optimizando imagen con sharp:", error);
    return NextResponse.json({ error: "Error al procesar la imagen" }, { status: 500 });
  }
}
