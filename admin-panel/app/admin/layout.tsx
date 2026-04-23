
"use client";
// Extiende el tipo Window para permitir window.sse
declare global {
  interface Window {
    sse?: EventSource;
  }
}

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getAdminProfile } from "@/components/ProfileModal";
import NotificationsPanel, { type Notif } from "@/components/NotificationsPanel";
import Omnibar from "@/components/admin/Omnibar";

const NAV_SECTIONS = [
  {
    section: "TIENDA",
    items: [
      { label: "Analítica", href: "/admin/analytics", icon: "analytics" },
      { label: "Punto de Venta", href: "/admin/pos", icon: "point_of_sale" },
      { label: "Pedidos", href: "/admin/orders", icon: "receipt_long" },
      { label: "Clientes", href: "/admin/customers", icon: "group" },
      { label: "Productos", href: "/admin/products", icon: "inventory_2" },
      { label: "Bundles (Kits)", href: "/admin/bundles", icon: "deployed_code" },
      { label: "Inventario", href: "/admin/inventory", icon: "store" },
      { label: "Compras", href: "/admin/purchases", icon: "add_shopping_cart" },
      { label: "Proveedores", href: "/admin/suppliers", icon: "handshake" },
      { label: "Gastos", href: "/admin/expenses", icon: "payments" },
      { label: "Categorías", href: "/admin/categories", icon: "category" },
      { label: "Cajas", href: "/admin/cash", icon: "account_balance_wallet" },
    ],
  },
  {
    section: "CONTENIDO",
    items: [
      { label: "Páginas", href: "/admin/pages", icon: "article" },
      { label: "Carrusel y Textos", href: "/admin/content", icon: "edit_document" },
      { label: "Colecciones", href: "/admin/collections", icon: "collections_bookmark" },
    ],
  },
  {
    section: "AJUSTES",
    items: [
      { label: "Configuración", href: "/admin/settings", icon: "settings" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [adminName, setAdminName] = useState("Administrador");
  const [adminEmail, setAdminEmail] = useState("admin@blush.com");
  const [adminRole, setAdminRole] = useState<"ADMIN" | "VENDEDOR">("ADMIN");
  const [storeName, setStoreName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [storeUrl, setStoreUrl] = useState("/");
  const [searchOpen, setSearchOpen] = useState(false);

  const buildNotifs = useCallback((orders: Record<string, unknown>[], products: Record<string, unknown>[], purchases: Record<string, unknown>[], read: Set<string>): Notif[] => {
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
    const oos = products.filter((p) => Number(p.totalStock) === 0);
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

    // Low stock (using dynamic minStock)
    const low = products.filter((p: any) => {
      const stock = Number(p.totalStock || 0);
      const threshold = Number(p.minStock ?? 5);
      return stock > 0 && stock <= threshold;
    });
    if (low.length > 0) {
      const id = "lowstock";
      notifs.push({
        id,
        type: "stock",
        title: `${low.length} producto${low.length > 1 ? "s" : ""} con stock bajo`,
        body: low.slice(0, 3).map((p: any) => `${p.name} (${p.totalStock})`).join(", ") + (low.length > 3 ? "..." : ""),
        href: "/admin/inventory",
        time: "Inventario",
        read: read.has(id),
      });
    }

    // Auto-generated drafts (Cron)
    const drafts = purchases.filter((p: any) => p.status === "DRAFT" && p.autoGenerated);
    if (drafts.length > 0) {
      const id = "auto-drafts";
      notifs.push({
        id,
        type: "stock", // or a new type if preferred
        title: `${drafts.length} orden${drafts.length > 1 ? "es" : ""} de compra sugerida${drafts.length > 1 ? "s" : ""}`,
        body: "Generadas por nivel bajo de inventario",
        href: "/admin/purchases?status=DRAFT",
        time: "Compras",
        read: read.has(id),
      });
    }

    return notifs;
  }, []);

  // Inicializar SSE global para notificaciones en tiempo real
  useEffect(() => {
    if (typeof window !== "undefined" && !window.sse) {
      window.sse = new EventSource("/api/admin/events");
      window.sse.onopen = () => {
        console.log("[SSE] Conexión abierta /api/admin/events");
      };
      window.sse.onerror = (e) => {
        // Ignorar el error SSE si estamos en el login (probable 401)
        if (window.location.pathname === "/admin/login") return;

        // Si el estado es CONNECTING, EventSource está reintentando automáticamente (es normal)
        if (window.sse?.readyState === EventSource.CONNECTING) {
          console.log("[SSE] Reconectando...");
          return;
        }

        // Otros errores graves o cierres definitivos
        console.error("[SSE] Error en la conexión SSE", e);
      };
    }
    return () => {
      if (typeof window !== "undefined" && window.sse) {
        window.sse.close();
        window.sse = undefined;
        console.log("[SSE] Conexión cerrada");
      }
    };
  }, []);

  useEffect(() => {
    // Si estamos en el login, no hacemos la carga del perfil
    if (pathname === "/admin/login") {
      setReady(true);
      return;
    }
    // El middleware ya garantizó que el token existe, así que cargamos directo:
    setReady(true);
    try {
      const p = getAdminProfile();
      setAdminName(p.name);
      setAdminEmail(p.email);
      setAdminRole(p.role);

      Promise.all([
        fetch("/api/admin/settings").then(r => r.ok ? r.json() : { storeName: "Tienda" }),
        fetch("/api/admin/branches").then(r => r.ok ? r.json() : []),
      ]).then(([s, b]) => {
        let name = s.storeName ?? "Tienda";
        if (p.role === "VENDEDOR" && p.branchId) {
          const branch = b.find((bx: any) => bx.id === p.branchId);
          if (branch) {
            name = branch.name === "tienda-online" ? "Tienda Online" : branch.name;
          }
        }
        setStoreName(name);
      }).catch(() => setStoreName("Tienda"));
    } catch (e) {
      router.replace("/admin/login");
      return;
    }

    // Load read IDs
    const stored = localStorage.getItem("adminReadNotifs");
    const read = new Set<string>(stored ? JSON.parse(stored) : []);

    // Fetch data for notifications
    Promise.all([
      fetch("/api/admin/orders").then((r) => r.ok ? r.json() : []),
      fetch("/api/admin/products").then((r) => r.ok ? r.json() : []),
      fetch("/api/admin/purchases").then((r) => r.ok ? r.json() : []),
    ]).then(([orders, products, purchases]) => {
      setNotifications(buildNotifs(orders, products, purchases, read));
    }).catch(() => {});

    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const port = window.location.port;

      if (hostname.startsWith("admin.")) {
        const storeHost = hostname.replace("admin.", "");
        setStoreUrl(`${protocol}//${storeHost}${port ? `:${port}` : ""}`);
      } else if (hostname === "localhost") {
        setStoreUrl(`${protocol}//localhost:3000`);
      } else {
        setStoreUrl("/");
      }
    }

    // 3. Escuchar el momento exacto en que ocurre algo en la tienda
    const handlePosUpdate = (_event: MessageEvent) => {
      console.log("[SSE] Evento recibido: venta/cambio de stock");
      // Recargar notificaciones
      const stored = localStorage.getItem("adminReadNotifs");
      const read = new Set<string>(stored ? JSON.parse(stored) : []);
      Promise.all([
        fetch("/api/admin/orders").then((r) => r.ok ? r.json() : []),
        fetch("/api/admin/products").then((r) => r.ok ? r.json() : []),
        fetch("/api/admin/purchases").then((r) => r.ok ? r.json() : []),
      ]).then(([orders, products, purchases]) => {
        setNotifications(buildNotifs(orders, products, purchases, read));
      }).catch(() => {});

      // MAGIA: Respetar el interruptor del usuario
      const alertsEnabled = localStorage.getItem("blush_alerts_enabled") !== "false";
      
      if (
        alertsEnabled &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        // Cambiamos el texto para que cubra ventas, cancelaciones y stock
        const title = "Movimiento en la Tienda 🔄";
        const options = {
          body: "Se ha registrado un pedido o un cambio de inventario.",
          icon: "/icon-192.png",
        };

        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, options).catch(() => {
              try { new Notification(title, options); } catch(e) {}
            });
          });
        } else {
          try { new Notification(title, options); } catch(e) {}
        }
      }
    };

    const handleLowStockDraft = (_event: MessageEvent) => {
      console.log("[SSE] Evento recibido: compras sugeridas autogeneradas");
      const stored = localStorage.getItem("adminReadNotifs");
      const read = new Set<string>(stored ? JSON.parse(stored) : []);
      Promise.all([
        fetch("/api/admin/orders").then((r) => r.ok ? r.json() : []),
        fetch("/api/admin/products").then((r) => r.ok ? r.json() : []),
        fetch("/api/admin/purchases").then((r) => r.ok ? r.json() : []),
      ]).then(([orders, products, purchases]) => {
        setNotifications(buildNotifs(orders, products, purchases, read));
      }).catch(() => {});
    };

    if (typeof window !== "undefined" && window.sse) {
      window.sse.addEventListener("pos_update", handlePosUpdate);
      window.sse.addEventListener("low_stock_draft", handleLowStockDraft);
    }

    // Limpiamos la "oreja" cuando el usuario cambia de página
    return () => {
      if (typeof window !== "undefined" && window.sse) {
        window.sse.removeEventListener("pos_update", handlePosUpdate);
        window.sse.removeEventListener("low_stock_draft", handleLowStockDraft);
      }
    };
  }, [pathname, router, buildNotifs]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  async function logout() {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch {
      // best-effort
    }
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

      {/* ── Mobile overlay ─────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] flex flex-col bg-[#1f1030] text-white overflow-y-auto transition-all duration-300 ease-in-out
        lg:static lg:z-auto lg:flex-shrink-0 lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        ${isCollapsed ? "w-20" : "w-64 lg:w-48"}
        print:hidden
      `}>
        {/* Brand & Collapse Toggle */}
        <div className={`px-6 border-b border-white/10 flex items-center justify-between h-20 transition-all ${isCollapsed ? "px-0 justify-center" : ""}`}>
          {!isCollapsed && (
            <div className="animate-in fade-in duration-500">
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/30">{storeName || "Panel"}</p>
              <p className="text-sm font-bold text-white mt-0.5 tracking-tight">Admin</p>
            </div>
          )}
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            title={isCollapsed ? "Expandir" : "Colapsar"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isCollapsed ? "menu_open" : "menu"}
            </span>
          </button>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link
            href="/admin"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-3.5 rounded-lg text-sm transition-all group ${
              pathname === "/admin"
                ? "bg-white/15 text-white font-semibold shadow-sm"
                : "text-white/60 hover:bg-white/8 hover:text-white"
            } ${isCollapsed ? "justify-center px-0" : ""}`}
            title={isCollapsed ? "Dashboard" : ""}
          >
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:scale-110">dashboard</span>
            {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-2 duration-300">Dashboard</span>}
          </Link>

          {NAV_SECTIONS.map(({ section, items }) => {
            if (adminRole === "VENDEDOR") {
              if (section === "AJUSTES" || section === "CONTENIDO") return null;
            }

            const filteredItems = items.filter(item => {
              if (adminRole === "VENDEDOR") {
                const forbidden = ["/admin/analytics", "/admin/categories", "/admin/expenses", "/admin/cash", "/admin/suppliers", "/admin/purchases"];
                if (forbidden.includes(item.href)) return false;
              }
              return true;
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={section} className="pt-4">
                {!isCollapsed ? (
                  <p className="px-3 mb-1.5 text-[9px] font-bold tracking-[0.18em] text-white/30 uppercase animate-in fade-in duration-300">
                    {section}
                  </p>
                ) : (
                  <div className="border-t border-white/5 mx-2 my-2" />
                )}
                {filteredItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-3.5 rounded-lg text-sm transition-all group relative ${
                      pathname.startsWith(item.href)
                        ? "bg-white/15 text-white font-semibold shadow-sm"
                        : "text-white/60 hover:bg-white/8 hover:text-white"
                    } ${isCollapsed ? "justify-center px-0" : ""}`}
                    title={isCollapsed ? item.label : ""}
                  >
                    {pathname.startsWith(item.href) && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.5)] animate-in fade-in duration-500" />
                    )}
                    <span className="material-symbols-outlined text-[18px] transition-transform group-hover:scale-110">{item.icon}</span>
                    {!isCollapsed && <span className="flex-1 animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>}
                    {item.label === "Inventario" && notifications.some(n => n.type === "stock" || n.type === "outofstock") && (
                      <span className={`w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 animate-pulse ${isCollapsed ? "absolute top-2 right-2" : ""}`} />
                    )}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className={`px-4 py-3 border-t border-white/10 space-y-1 mt-auto ${isCollapsed ? "px-0 text-center" : ""}`}>
          <Link
            href={storeUrl}
            target="_blank"
            className="flex items-center gap-2 text-[12px] text-white/40 hover:text-white/70 transition-colors py-1.5 px-2 group"
            title={isCollapsed ? "Ver tienda" : ""}
          >
            <span className="material-symbols-outlined text-[16px] group-hover:rotate-45 transition-transform">open_in_new</span>
            {!isCollapsed && <span className="animate-in fade-in duration-300">Ver tienda</span>}
          </Link>
          <button
            onClick={() => { localStorage.removeItem("adminAuth"); router.replace("/admin/login"); }}
            className="flex items-center gap-2 text-[12px] text-white/40 hover:text-white/70 transition-colors w-full text-left py-1.5 px-2 group"
            title={isCollapsed ? "Cerrar sesión" : ""}
          >
            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">logout</span>
            {!isCollapsed && <span className="animate-in fade-in duration-300">Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative h-screen overflow-hidden">
        
        {/* Unified Top Header - Glassmorphism & Overlay Style */}
        <header className="absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-4 sm:px-6 shrink-0 z-50 print:hidden bg-white/50 backdrop-blur-md border-b border-gray-200/30">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-black/5 text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            
            {/* Search Input Placeholder - Delicate & Modern Style */}
            <div className="max-w-[280px] w-full">
              <button 
                onClick={() => setSearchOpen(true)}
                className="w-full h-8 flex items-center gap-2 px-3 bg-white/40 hover:bg-white/80 rounded-full text-gray-500 transition-all text-[12px] text-left group border border-gray-200/50 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px] opacity-60">search</span>
                <span className="flex-1 truncate opacity-70">Buscar...</span>
                <div className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-500/10 text-[9px] font-medium text-gray-500 opacity-60">
                  <span className="text-[10px]">⌘</span>
                  <span>K</span>
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 ml-4">
            {/* Notifications */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative p-2 rounded-lg hover:bg-black/5 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center border-2 border-white/50">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Profile */}
            <Link
              href="/admin/profile"
              className="flex items-center gap-2 p-1 pl-1 pr-1.5 sm:pr-2 rounded-full hover:bg-black/5 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#33172c] flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm">
                {adminName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "A"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[10px] font-bold text-gray-800 leading-tight truncate max-w-[80px]">{adminName}</p>
                <p className="text-[8px] text-gray-500 leading-tight uppercase font-bold tracking-tighter">{adminRole}</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Content Container - Smart padding: pt-12 for standard pages, pt-0 for Hero pages (Profile) */}
        <main 
          key={pathname}
          className={`flex-1 overflow-y-auto relative print:overflow-visible print:block animate-reveal-page ${pathname === '/admin/profile' ? 'pt-0' : 'pt-12'}`}
        >
          {children}
        </main>
      </div>

      {/* Notifications Panel */}
      <NotificationsPanel
        open={notifOpen}
        notifications={notifications}
        onClose={() => setNotifOpen(false)}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />

      {/* Omnibar Search */}
      <Omnibar open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
