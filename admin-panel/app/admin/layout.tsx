"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getAdminProfile } from "@/components/ProfileModal";
import NotificationsPanel, { type Notif } from "@/components/NotificationsPanel";

const NAV_SECTIONS = [
  {
    section: "TIENDA",
    items: [
      { label: "Analítica", href: "/admin/analytics", icon: "analytics" },
      { label: "Productos", href: "/admin/products", icon: "inventory_2" },
      { label: "Categorías", href: "/admin/categories", icon: "category" },
      { label: "Pedidos", href: "/admin/orders", icon: "receipt_long" },
    ],
  },
  {
    section: "CONTENIDO",
    items: [
      { label: "Páginas", href: "/admin/pages", icon: "article" },
      { label: "Carrusel y Textos", href: "/admin/content", icon: "edit_document" },
      { label: "Colecciones", href: "/admin/collections", icon: "collections_bookmark" },
      { label: "Políticas", href: "/admin/policies", icon: "policy" },
    ],
  },
  {
    section: "CONFIGURACIÓN",
    items: [
      { label: "Métodos de Envío", href: "/admin/shipping", icon: "local_shipping" },
      { label: "Métodos de Pago", href: "/admin/payments", icon: "payments" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [adminName, setAdminName] = useState("Administrador");
  const [adminEmail, setAdminEmail] = useState("admin@blush.com");
  const [storeName, setStoreName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);

  const buildNotifs = useCallback((orders: Record<string, unknown>[], products: Record<string, unknown>[], read: Set<string>): Notif[] => {
    const notifs: Notif[] = [];
    const now = Date.now();

    // New orders in last 48h
    orders
      .filter((o) => {
        const d = new Date(o.date as string).getTime();
        return now - d < 48 * 60 * 60 * 1000;
      })
      .slice(0, 5)
      .forEach((o) => {
        const id = `order-${o.id}`;
        notifs.push({
          id,
          type: "order",
          title: `Nuevo pedido de ${o.customer}`,
          body: `${o.id} · $${Number(o.total).toFixed(2)} · ${o.status}`,
          href: `/admin/orders/${o.id}`,
          time: new Date(o.date as string).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
          read: read.has(id),
        });
      });

    // Pending orders
    const pending = orders.filter((o) => o.status === "Pendiente");
    if (pending.length > 0) {
      const id = "pending-orders";
      notifs.push({
        id,
        type: "order",
        title: `${pending.length} pedido${pending.length > 1 ? "s" : ""} pendiente${pending.length > 1 ? "s" : ""}`,
        body: "Requieren atención o confirmación",
        href: "/admin/orders",
        time: "Ahora",
        read: read.has(id),
      });
    }

    // Out of stock
    const oos = products.filter((p) => Number(p.stock) === 0);
    if (oos.length > 0) {
      const id = "outofstock";
      notifs.push({
        id,
        type: "outofstock",
        title: `${oos.length} producto${oos.length > 1 ? "s" : ""} sin stock`,
        body: oos.slice(0, 3).map((p) => p.name).join(", ") + (oos.length > 3 ? "..." : ""),
        href: "/admin/products",
        time: "Inventario",
        read: read.has(id),
      });
    }

    // Low stock (1-5 units)
    const low = products.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 5);
    if (low.length > 0) {
      const id = "lowstock";
      notifs.push({
        id,
        type: "stock",
        title: `${low.length} producto${low.length > 1 ? "s" : ""} con stock bajo`,
        body: low.slice(0, 3).map((p) => `${p.name} (${p.stock})`).join(", ") + (low.length > 3 ? "..." : ""),
        href: "/admin/products",
        time: "Inventario",
        read: read.has(id),
      });
    }

    return notifs;
  }, []);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => {
        if (!r.ok) return { storeName: "Tienda" };
        return r.json() as Promise<{ storeName?: string }>;
      })
      .then((s) => setStoreName(s?.storeName ?? "Tienda"))
      .catch((e) => {
        console.error("Failed to fetch settings:", e);
        setStoreName("Tienda");
      });

    if (pathname === "/admin/login") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true);
      return;
    }
    const auth = localStorage.getItem("adminAuth");
    if (!auth) {
      router.replace("/admin/login");
    } else {
      setReady(true);
      const p = getAdminProfile();
      setAdminName(p.name);
      setAdminEmail(p.email);

      // Load read IDs
      const stored = localStorage.getItem("adminReadNotifs");
      const read = new Set<string>(stored ? JSON.parse(stored) : []);

      // Fetch data for notifications
      Promise.all([
        fetch("/api/admin/orders").then((r) => r.json()),
        fetch("/api/admin/products").then((r) => r.json()),
      ]).then(([orders, products]) => {
        setNotifications(buildNotifs(orders, products, read));
      }).catch(() => {});
    }
  }, [pathname, router, buildNotifs]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0f0a1a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#bc93ad] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  function logout() {
    localStorage.removeItem("adminAuth");
    router.replace("/admin/login");
  }

  function markRead(id: string) {
    setNotifications((ns) => {
      const nextIds = new Set(ns.filter((n) => n.read).map((n) => n.id));
      nextIds.add(id);
      localStorage.setItem("adminReadNotifs", JSON.stringify([...nextIds]));
      return ns.map((n) => n.id === id ? { ...n, read: true } : n);
    });
  }

  function markAllRead() {
    const ids = new Set(notifications.map((n) => n.id));
    localStorage.setItem("adminReadNotifs", JSON.stringify([...ids]));
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/pages") {
      return pathname.startsWith("/admin/pages") ||
        pathname.startsWith("/admin/novedades") ||
        pathname.startsWith("/admin/mas-vendidos") ||
        pathname.startsWith("/admin/tutorials") ||
        pathname.startsWith("/admin/home");
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-screen bg-[#f6f7f9] overflow-hidden" style={{ fontFamily: "Manrope, sans-serif" }}>

      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 h-14 bg-[#1f1030] flex items-center gap-3 px-4 shadow-lg">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors flex-shrink-0"
          aria-label="Abrir menú"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>
        <p className="text-sm font-bold text-white flex-1 truncate">{storeName || "Admin"}</p>
        {/* Bell — mobile */}
        <button
          onClick={() => setNotifOpen(true)}
          className="relative p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors flex-shrink-0"
          aria-label="Notificaciones"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <Link
          href="/admin/profile"
          onClick={() => setSidebarOpen(false)}
          className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 hover:bg-white/30 transition-colors"
        >
          {adminName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "A"}
        </Link>
      </div>

      {/* ── Mobile overlay ─────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[#1f1030] text-white overflow-y-auto transition-transform duration-300
        lg:static lg:z-auto lg:w-56 lg:flex-shrink-0 lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/50">{storeName || "Panel"}</p>
            <p className="text-sm font-bold text-white mt-0.5">Admin</p>
          </div>
          <div className="flex items-center gap-1">
            {/* Bell — desktop */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              aria-label="Notificaciones"
            >
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Dashboard */}
        <nav className="flex-1 px-3 py-4">
          <Link
            href="/admin"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${
              isActive("/admin") && pathname === "/admin"
                ? "bg-white/15 text-white font-semibold"
                : "text-white/60 hover:bg-white/8 hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            Dashboard
          </Link>

          {NAV_SECTIONS.map(({ section, items }) => (
            <div key={section} className="mt-5">
              <p className="px-3 mb-1.5 text-[9px] font-bold tracking-[0.18em] text-white/30 uppercase">
                {section}
              </p>
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors ${
                    isActive(item.href)
                      ? "bg-white/15 text-white font-semibold"
                      : "text-white/60 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Profile button */}
        <div className="px-3 py-3 border-t border-white/10">
          <Link
            href="/admin/profile"
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors group text-left ${pathname === "/admin/profile" ? "bg-white/15" : ""}`}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
              {adminName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{adminName}</p>
              <p className="text-[10px] text-white/40 truncate">{adminEmail}</p>
            </div>
            <span className="material-symbols-outlined text-[16px] text-white/30 group-hover:text-white/60 flex-shrink-0">settings</span>
          </Link>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 space-y-1">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 text-[12px] text-white/40 hover:text-white/70 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            Ver tienda
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-[12px] text-white/40 hover:text-white/70 transition-colors w-full"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Notifications Panel */}
      <NotificationsPanel
        open={notifOpen}
        notifications={notifications}
        onClose={() => setNotifOpen(false)}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />

      {/* Content */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
