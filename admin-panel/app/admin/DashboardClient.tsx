
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Product { id: string; name: string; price: number; category: string; minStock?: number; totalStock?: number; image?: string; }
interface OrderProduct { id: string; name: string; price: number; quantity: number; }
interface Order { id: string; customer: string; total: number; status: string; date: string; items: number; paymentMethod: string; products?: OrderProduct[]; }
interface Branch { id: string; name: string; }

const STATUS_LABEL: Record<string, string> = {
  completed: "Completado",
  pending: "Pendiente",
  processing: "En proceso",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};
const STATUS_COLOR: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-purple-100 text-purple-700",
};
const STATUS_CHART_COLOR: Record<string, string> = {
  completed: "#10b981",
  pending: "#f59e0b",
  processing: "#6366f1",
  cancelled: "#ef4444",
  refunded: "#a855f7",
};

const PERIOD_MAP = {
  "today": { label: "Hoy", days: 1 },
  "7d": { label: "7 días", days: 7 },
  "14d": { label: "14 días", days: 14 },
  "30d": { label: "1 mes", days: 30 },
  "90d": { label: "3 meses", days: 90 },
  "180d": { label: "6 meses", days: 180 },
  "365d": { label: "1 año", days: 365 },
};
type PeriodKey = keyof typeof PERIOD_MAP;

function smoothPath(pts: { x: number; y: number }[]): string {
  if (!pts.length) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C ${cx} ${pts[i - 1].y} ${cx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

function arcPath(cx: number, cy: number, r: number, ir: number, a1: number, a2: number): string {
  const pt = (radius: number, angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };
  const [o1, o2, i2, i1] = [pt(r, a1), pt(r, a2), pt(ir, a2), pt(ir, a1)];
  const lg = a2 - a1 > 180 ? 1 : 0;
  return `M ${o1.x} ${o1.y} A ${r} ${r} 0 ${lg} 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${ir} ${ir} 0 ${lg} 0 ${i1.x} ${i1.y} Z`;
}

export default function DashboardClient({
  products,
  orders,
  settings,
  branches
}: {
  products: Product[],
  orders: Order[],
  settings: any,
  branches: Branch[]
}) {


  // Estado para periodo, hover y ancho del gráfico
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("14d");
  const [hovered, setHovered] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(560); // valor inicial
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateWidth() {
      if (chartRef.current) {
        setChartWidth(chartRef.current.offsetWidth);
      }
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Lógica de filtrado por periodo dinámico
  const now = new Date();
  const currentPeriodDays = PERIOD_MAP[selectedPeriod].days;
  const periodDate = new Date();
  if (selectedPeriod === "today") {
    // "Hoy" = desde las 00:00:00 del día actual
    periodDate.setHours(0, 0, 0, 0);
  } else {
    periodDate.setDate(now.getDate() - currentPeriodDays);
    periodDate.setHours(0, 0, 0, 0);
  }

  const recentOrders = orders.filter(o => new Date(o.date) >= periodDate);
  const activeRecentOrders = recentOrders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
  const recentRevenue = activeRecentOrders.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === "pending" || o.status === "processing").length;

  // Productos con bajo stock
  const lowStockProducts = products.filter(p => {
    const threshold = p.minStock ?? 5;
    const currentStock = p.totalStock ?? 0;
    return currentStock <= threshold;
  });

  // Gráfica de ingresos
  const DAY_NAMES = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
  const todayStr = new Date().toISOString().split("T")[0];
  const CHART_DAYS = currentPeriodDays;
  const chartData = Array.from({ length: CHART_DAYS }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (CHART_DAYS - 1 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayOrders = orders.filter(
      (o) => o.status !== "cancelled" && o.status !== "refunded" && o.date.split("T")[0] === dateStr
    );
    return {
      date: dateStr,
      dayLabel: DAY_NAMES[d.getDay()],
      dayNum: d.getDate(),
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      count: dayOrders.length,
    };
  });
  const chartMax = Math.max(...chartData.map((d) => d.revenue), 1);
  const chartHasData = chartData.some((d) => d.revenue > 0);
  // Dimensiones responsivas
  const SVG_W = chartWidth;
  const SVG_H = 190;
  const PAD_L = 44;
  const PAD_T = 16;
  const CHART_W = SVG_W - PAD_L - 12; // margen derecho
  const CHART_H = 128;
  const BASELINE = PAD_T + CHART_H;
  const xStep = CHART_DAYS > 1 ? CHART_W / (CHART_DAYS - 1) : CHART_W;
  const pts = chartData.map((d, i) => ({
    x: PAD_L + (CHART_DAYS > 1 ? i * xStep : CHART_W / 2),
    y: BASELINE - (d.revenue / chartMax) * CHART_H,
    ...d
  }));
  const linePath = smoothPath(pts);
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${BASELINE} L ${pts[0].x} ${BASELINE} Z`;
  const hoveredPoint = hovered !== null ? pts[hovered] : null;

  // Donut chart de estados
  const donutTotal = orders.length || 1;
  const donutSegs: { status: string; count: number; a1: number; a2: number }[] = [];
  let donutAngle = 0;
  for (const s of ["completed", "pending", "processing", "cancelled", "refunded"]) {
    const count = orders.filter((o) => o.status === s).length;
    if (count > 0) {
      const sweep = (count / donutTotal) * 360;
      donutSegs.push({ status: s, count, a1: donutAngle, a2: donutAngle + sweep });
      donutAngle += sweep;
    }
  }

  // Stats cards
  const productCount = products.length;
  const STATS = [
    { label: "Productos", value: productCount, icon: "inventory_2", href: "/admin/products", color: "text-violet-600 bg-violet-50" },
    { label: `Pedidos (${PERIOD_MAP[selectedPeriod].label})`, value: activeRecentOrders.length, icon: "receipt_long", href: "/admin/orders", color: "text-blue-600 bg-blue-50" },
    { label: "Sin atender", value: pending, icon: "pending_actions", href: "/admin/orders", color: "text-amber-600 bg-amber-50" },
    { label: `Ventas (${PERIOD_MAP[selectedPeriod].label})`, value: `$${recentRevenue.toFixed(2)}`, icon: "payments", href: "/admin/orders", color: "text-emerald-600 bg-emerald-50" },
  ];

  // Acciones rápidas
  const QUICK_ACTIONS = [
    { label: "Analitica", href: "/admin/analytics", icon: "analytics" },
    { label: "Agregar Producto", href: "/admin/products/new", icon: "add_circle" },
    { label: "Ver Pedidos", href: "/admin/orders", icon: "receipt_long" },
    { label: "Editar Contenido", href: "/admin/content", icon: "edit" },
    { label: "Metodos de Pago", href: "/admin/payments", icon: "credit_card" },
    { label: "Metodos de Envio", href: "/admin/shipping", icon: "local_shipping" },
    { label: "Politicas", href: "/admin/policies", icon: "policy" },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 font-medium">Resumen general de {settings?.storeName ?? "Mi Tienda"}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as PeriodKey)}
            className="bg-white border border-gray-200 text-xs font-bold px-4 py-2 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {Object.entries(PERIOD_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Alertas Críticas */}
      {lowStockProducts.length > 0 && (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-sm shadow-rose-100/50">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-rose-600 shadow-sm flex-shrink-0 animate-pulse">
            <span className="material-symbols-outlined text-[28px]">warning</span>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-bold text-rose-900">Alerta de Inventario</h3>
            <p className="text-sm text-rose-700/80">Tienes {lowStockProducts.length} productos con stock crítico o agotados. Revisa tus suministros para evitar perder ventas.</p>
          </div>
          <Link
            href="/admin/inventory"
            className="px-6 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-all shadow-md shadow-rose-200"
          >
            Gestionar Stock
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STATS.map((stat) => (
          <Link key={stat.label} href={stat.href}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              <span className="material-symbols-outlined text-[20px]">{stat.icon}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 group-hover:text-[#33172c] transition-colors">{stat.value}</div>
            <div className="text-[11px] text-gray-500 mt-1 uppercase tracking-wider font-semibold">{stat.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div ref={chartRef} className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Ingresos</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Vista: {PERIOD_MAP[selectedPeriod].label}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-[#33172c]">${recentRevenue.toFixed(2)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">total periodo</p>
            </div>
          </div>
          {!chartHasData ? (
            <div className="flex flex-col items-center justify-center h-44 gap-3">
              <span className="material-symbols-outlined text-5xl text-gray-200">show_chart</span>
              <p className="text-sm text-gray-500">Sin ventas en el periodo: {PERIOD_MAP[selectedPeriod].label}</p>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              width="100%"
              height={SVG_H}
              className="w-full select-none"
              style={{ cursor: "crosshair", display: "block" }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const svgX = ((e.clientX - rect.left) / rect.width) * SVG_W;
                const idx = Math.round((svgX - PAD_L) / xStep);
                setHovered(Math.max(0, Math.min(CHART_DAYS - 1, idx)));
              }}
              onMouseLeave={() => setHovered(null)}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#33172c" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#33172c" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                const val = chartMax * pct;
                const y = BASELINE - pct * CHART_H;
                return (
                  <g key={pct}>
                    <line x1={PAD_L} y1={y} x2={PAD_L + CHART_W} y2={y} stroke="#f3f4f6" strokeWidth={pct === 0 ? 1.5 : 1} />
                    <text x={PAD_L - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#6b7280">
                      {val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val.toFixed(0)}`}
                    </text>
                  </g>
                );
              })}
              <path d={areaPath} fill="url(#areaGrad)" />
              <path d={linePath} fill="none" stroke="#33172c" strokeWidth={2} strokeLinecap="round" />
              {pts.filter((_, i) => {
                if (CHART_DAYS <= 14) return true;
                if (CHART_DAYS <= 60) return i % 5 === 0;
                if (CHART_DAYS <= 180) return i % 15 === 0;
                return i % 30 === 0;
              }).map((p) => (
                <text key={p.date} x={p.x} y={BASELINE + 18} textAnchor="middle" fontSize={9}
                  fill={p.date === todayStr ? "#33172c" : "#d1d5db"}
                  fontWeight={p.date === todayStr ? "700" : "400"}>
                  {p.dayLabel} {p.dayNum}
                </text>
              ))}
              {pts.map((p) => p.revenue > 0 ? (
                <circle key={`dot-${p.date}`} cx={p.x} cy={p.y} r={3}
                  fill={p.date === todayStr ? "#33172c" : "#c4a0bb"} stroke="white" strokeWidth={1.5} />
              ) : null)}
              {hoveredPoint && (() => {
                const tipW = 100, tipH = 52;
                const tipX = hoveredPoint.x + tipW + 14 > SVG_W ? hoveredPoint.x - tipW - 6 : hoveredPoint.x + 6;
                const tipY = Math.max(PAD_T, hoveredPoint.y - tipH / 2);
                const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(2)}`;
                return (
                  <g>
                    <line x1={hoveredPoint.x} y1={PAD_T} x2={hoveredPoint.x} y2={BASELINE}
                      stroke="#33172c" strokeWidth={1} strokeDasharray="3 3" opacity={0.3} />
                    <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r={6} fill="#33172c" opacity={0.12} />
                    <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r={4} fill="#33172c" />
                    <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r={2} fill="white" />
                    <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={8} fill="#1c0f19" />
                    <text x={tipX + tipW / 2} y={tipY + 14} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.5)">
                      {hoveredPoint.date.slice(5)}
                    </text>
                    <text x={tipX + tipW / 2} y={tipY + 31} textAnchor="middle" fontSize={14} fill="white" fontWeight="700">
                      {fmt(hoveredPoint.revenue)}
                    </text>
                    <text x={tipX + tipW / 2} y={tipY + 46} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.4)">
                      {hoveredPoint.count} {hoveredPoint.count === 1 ? "pedido" : "pedidos"}
                    </text>
                  </g>
                );
              })()}
            </svg>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Estado de Pedidos</h2>
          <p className="text-[11px] text-gray-500 mb-4">Distribucion por estado</p>
          {orders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-5xl text-gray-200">donut_large</span>
              <p className="text-sm text-gray-500">Sin pedidos aun</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5">
              <svg viewBox="0 0 200 200" className="w-36 h-36">
                {donutSegs.map((seg) => (
                  <path key={seg.status}
                    d={arcPath(100, 100, 72, 50, seg.a1, Math.max(seg.a1 + 2, seg.a2 - (donutSegs.length > 1 ? 2 : 0)))}
                    fill={STATUS_CHART_COLOR[seg.status] ?? "#e5e7eb"} />
                ))}
                <text x="100" y="97" textAnchor="middle" fontSize="24" fontWeight="800" fill="#1f2937">{orders.length}</text>
                <text x="100" y="114" textAnchor="middle" fontSize="9" fill="#9ca3af">PEDIDOS</text>
              </svg>
              <div className="w-full space-y-2.5">
                {donutSegs.map((seg) => (
                  <div key={seg.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_CHART_COLOR[seg.status] }} />
                      <span className="text-[11px] text-gray-500">{STATUS_LABEL[seg.status]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800">{seg.count}</span>
                      <span className="text-[10px] text-gray-500 w-8 text-right">{((seg.count / donutTotal) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Acciones Rapidas</h2>
          <div className="space-y-1">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.href} href={a.href}
                className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#33172c] hover:bg-gray-50 px-3 py-2.5 rounded-xl transition-colors">
                <span className="material-symbols-outlined text-[18px] text-gray-500">{a.icon}</span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pedidos Recientes</h2>
            <Link href="/admin/orders" className="text-xs text-[#33172c] hover:underline font-medium">Ver todos</Link>
          </div>
          {orders.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">No hay pedidos aun.</div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <Link key={order.id} href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{order.customer}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{order.id} {order.date} {order.items} art.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">${order.total.toFixed(2)}</p>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full mt-1 inline-block ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
