import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

const VALID_TAGS = ["products", "settings", "pages", "tutorials"] as const;
type ValidTag = typeof VALID_TAGS[number];

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tag = request.nextUrl.searchParams.get("tag") as ValidTag | null;

  if (tag && VALID_TAGS.includes(tag)) {
    // @ts-ignore: Next.js exige 2 argumentos en los tipos de esta versión, pero falla en ejecución si pasamos un objeto.
    revalidateTag(tag);
    revalidatePath("/", "layout");
    return NextResponse.json({ revalidated: true, tag });
  }

  // No tag → revalidate everything
  for (const t of VALID_TAGS) {
    // @ts-ignore
    revalidateTag(t);
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true, tags: VALID_TAGS });
}
