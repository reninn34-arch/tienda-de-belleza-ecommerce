import { cookies } from "next/headers";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // 1. Obtener la cookie segura de Next.js
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  // 2. Apuntar al backend de Express directamente
  const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  try {
    // 3. ¡CORRECCIÓN AQUÍ! Las rutas de Express no llevan "/admin"
    const [productsRes, ordersRes, settingsRes, branchesRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/products`, { headers, cache: "no-store" }),
      fetch(`${BACKEND_URL}/api/orders`, { headers, cache: "no-store" }),
      fetch(`${BACKEND_URL}/api/settings`, { headers, cache: "no-store" }),
      fetch(`${BACKEND_URL}/api/branches`, { headers, cache: "no-store" })
    ]);

    // Transformar los resultados
    const products = productsRes.ok ? await productsRes.json() : [];
    const orders = ordersRes.ok ? await ordersRes.json() : [];
    const settings = settingsRes.ok ? await settingsRes.json() : { storeName: "Mi Tienda" };
    const branches = branchesRes.ok ? await branchesRes.json() : [];

    // 4. Inyectar los datos limpios a la Vista (Cliente)
    return (
      <DashboardClient
        products={Array.isArray(products) ? products : []}
        orders={Array.isArray(orders) ? orders : []}
        settings={settings}
        branches={Array.isArray(branches) ? branches : []}
      />
    );
  } catch (error) {
    console.error("Error cargando el dashboard:", error);
    // Si el servidor Express está apagado, evitamos que la pantalla crashee
    return <DashboardClient products={[]} orders={[]} settings={{}} branches={[]} />;
  }
}