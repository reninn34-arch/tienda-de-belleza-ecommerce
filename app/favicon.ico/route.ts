import { getBranding } from "@/lib/data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { faviconUrl } = await getBranding();
    if (faviconUrl && faviconUrl.trim() !== "") {
      return redirect(faviconUrl);
    }
  } catch (error) {
    console.error("Error redirecting to dynamic favicon:", error);
  }

  // Fallback al icono por defecto del proyecto
  return redirect("/icon.svg");
}
