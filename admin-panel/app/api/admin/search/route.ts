import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

const STATIC_PAGES = [
  { title: "Dashboard", url: "/admin", icon: "dashboard" },
  { title: "Analítica", url: "/admin/analytics", icon: "analytics" },
  { title: "Punto de Venta", url: "/admin/pos", icon: "point_of_sale" },
  { title: "Pedidos", url: "/admin/orders", icon: "receipt_long" },
  { title: "Clientes", url: "/admin/customers", icon: "group" },
  { title: "Productos", url: "/admin/products", icon: "inventory_2" },
  { title: "Bundles (Kits)", url: "/admin/bundles", icon: "deployed_code" },
  { title: "Inventario", url: "/admin/inventory", icon: "store" },
  { title: "Compras", url: "/admin/purchases", icon: "add_shopping_cart" },
  { title: "Proveedores", url: "/admin/suppliers", icon: "handshake" },
  { title: "Gastos", url: "/admin/expenses", icon: "payments" },
  { title: "Categorías", url: "/admin/categories", icon: "category" },
  { title: "Cajas", url: "/admin/cash", icon: "account_balance_wallet" },
  { title: "Páginas de Contenido", url: "/admin/pages", icon: "article" },
  { title: "Carrusel y Textos", url: "/admin/content", icon: "edit_document" },
  { title: "Colecciones", url: "/admin/collections", icon: "collections_bookmark" },
  { title: "Configuración General", url: "/admin/settings", icon: "settings" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const [products, orders, customers] = await Promise.all([
      // Search Products
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { id: { contains: q, mode: "insensitive" } },
            { badge: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 4,
        select: { id: true, name: true, price: true, image: true },
      }),
      // Search Orders
      prisma.order.findMany({
        where: {
          OR: [
            { id: { contains: q, mode: "insensitive" } },
            { customer: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 4,
        select: { id: true, customer: true, status: true, total: true },
      }),
      // Search Customers
      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { cedula: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 4,
        select: { id: true, name: true, email: true },
      }),
    ]);

    interface SearchResult {
      id: string;
      type: "page" | "product" | "order" | "customer";
      title: string;
      subtitle: string;
      url: string;
      icon: string;
      image?: string | null;
    }

    const results: SearchResult[] = [];

    // 1. Pages
    const pages = STATIC_PAGES.filter(p => p.title.toLowerCase().includes(q) || p.url.toLowerCase().includes(q));
    pages.forEach(p => {
      results.push({
        id: `page-${p.url}`,
        type: "page",
        title: p.title,
        subtitle: "Ir al módulo",
        url: p.url,
        icon: p.icon,
      });
    });

    // 2. Products
    products.forEach(p => {
      results.push({
        id: `prod-${p.id}`,
        type: "product",
        title: p.name,
        subtitle: `$${p.price.toFixed(2)}`,
        url: `/admin/products/${p.id}`,
        image: p.image,
        icon: "inventory_2",
      });
    });

    // 3. Orders
    orders.forEach(o => {
      results.push({
        id: `ord-${o.id}`,
        type: "order",
        title: `Pedido ${o.id}`,
        subtitle: `${o.customer} · $${o.total.toFixed(2)} · ${o.status}`,
        url: `/admin/orders/${o.id}`,
        icon: "receipt_long",
      });
    });

    // 4. Customers
    customers.forEach(c => {
      results.push({
        id: `cust-${c.id}`,
        type: "customer",
        title: c.name,
        subtitle: c.email,
        url: `/admin/customers/${c.id}`,
        icon: "person",
      });
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
