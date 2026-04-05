import LoginForm from "./LoginForm";

async function getStoreName(): Promise<string> {
  try {
    const res = await fetch(`${process.env.BACKEND_URL || 'http://localhost:4000'}/api/settings`, {
      cache: "no-store",
    });
    if (!res.ok) return "Admin Panel";
    const data = await res.json();
    return data.storeName ?? "Tienda";
  } catch (e) {
    console.error("Error fetching storeName in login:", e);
    return "Admin Panel";
  }
}

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const storeName = await getStoreName();
  return <LoginForm storeName={storeName} />;
}
