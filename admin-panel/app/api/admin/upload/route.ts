import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
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

  const ext = file.name.split(".").pop() ?? "jpg";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Store's public/uploads (served by the storefront at port 3000)
  const storeUploadDir = join(process.cwd(), "..", "public", "uploads");
  // Admin's own public/uploads (served by the admin panel at port 3001) — needed for preview
  const adminUploadDir = join(process.cwd(), "public", "uploads");

  await Promise.all([
    mkdir(storeUploadDir, { recursive: true }).then(() => writeFile(join(storeUploadDir, safeName), buffer)),
    mkdir(adminUploadDir, { recursive: true }).then(() => writeFile(join(adminUploadDir, safeName), buffer)),
  ]);

  return NextResponse.json({ url: `/uploads/${safeName}` });
}
