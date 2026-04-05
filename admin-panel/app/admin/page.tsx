"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Product { id: string; name: string; price: number; category: string; }
interface OrderProduct { id: string; name: string; price: number; quantity: number; }
interface Order { id: string; customer: string; total: number; status: string; date: string; items: number; paymentMethod: string; products?: OrderProduct[]; }

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

export default function AdminDashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeName, setStoreName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/products").then((r) => r.json()),
      fetch("/api/admin/orders").then((r) => r.json()),
      fetch("/api/admin/settings").then((r) => r.json()),
    ]).then(([p, o, s]) => {
      setProducts(p);
      setOrders(o);
      setStoreName(s.storeName ?? "Mi Tienda");
      setLoaded(true);
    });
  }, []);

  const activeOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
  const revenue = activeOrders.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === "pending" || o.status === "processing").length;

  const DAY_NAMES = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
  const todayStr = new Date().toISOString().split("T")[0];
  const CHART_DAYS = 14;
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
  const SVG_W = 560, SVG_H = 190, PAD_L = 44, PAD_T = 16, CHART_W = 504, CHART_H = 128;
  const BASELINE = PAD_T + CHART_H;
  const xStep = CHART_W / (CHART_DAYS - 1);
  const pts = chartData.map((d, i) => ({ x: PAD_L + i * xStep, y: BASELINE - (d.revenue / chartMax) * CHART_H, ...d }));
  const linePath = smoothPath(pts);
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${BASELINE} L ${pts[0].x} ${BASELINE} Z`;
  const hoveredPoint = hovered !== null ? pts[hovered] : null;

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

  const STATS = [
    { label: "Productos", value: loaded ? products.length : "---", icon: "inventory_2", href: "/admin/products", color: "text-violet-600 bg-violet-50" },
    { label: "Pedidos activos", value: loaded ? activeOrders.length : "---", icon: "receipt_long", href: "/admin/orders", color: "text-blue-600 bg-blue-50" },
    { label: "Sin atender", value: loaded ? pending : "---", icon: "pending_actions", href: "/admin/orders", color: "text-amber-600 bg-amber-50" },
    { label: "Ingresos", value: loaded ? `$${revenue.toFixed(2)}` : "---", icon: "payments", href: "/admin/orders", color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Panel de control · {loaded ? storeName : "Cargando..."}</p>
      </div>

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

      {loaded && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Ingresos</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Ultimos 14 dias sin cancelados ni reembolsos</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-[#33172c]">${revenue.toFixed(0)}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">acumulado</p>
              </div>
            </div>
            {!chartHasData ? (
              <div className="flex flex-col items-center justify-center h-44 gap-3">
                <span className="material-symbols-outlined text-5xl text-gray-200">show_chart</span>
                <p className="text-sm text-gray-500">Sin ventas en los ultimos 14 dias</p>
              </div>
            ) : (
              <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full select-none"
                style={{ height: SVG_H, cursor: "crosshair" }}
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
                {pts.filter((_, i) => i % 2 === 0).map((p) => (
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Acciones Rapidas</h2>
          <div className="space-y-1">
            {[
              { label: "Analitica", href: "/admin/analytics", icon: "analytics" },
              { label: "Agregar Producto", href: "/admin/products/new", icon: "add_circle" },
              { label: "Ver Pedidos", href: "/admin/orders", icon: "receipt_long" },
              { label: "Editar Contenido", href: "/admin/content", icon: "edit" },
              { label: "Metodos de Pago", href: "/admin/payments", icon: "credit_card" },
              { label: "Metodos de Envio", href: "/admin/shipping", icon: "local_shipping" },
              { label: "Politicas", href: "/admin/policies", icon: "policy" },
            ].map((a) => (
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
          {!loaded ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
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

