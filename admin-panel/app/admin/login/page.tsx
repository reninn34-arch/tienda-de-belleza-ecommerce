import { readFileSync } from "fs";
import { join } from "path";
import LoginForm from "./LoginForm";

function getStoreName(): string {
  try {
    const p = join(process.cwd(), "..", "data", "settings.json");
    const raw = readFileSync(p, "utf-8").replace(/^\uFEFF/, "");
    const settings = JSON.parse(raw);
    return settings?.storeName ?? "Tienda";
  } catch (e) {
    console.error("Error reading storeName in login:", e);
    return "Admin Panel";
  }
}

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const storeName = getStoreName();
  return <LoginForm storeName={storeName} />;
}
