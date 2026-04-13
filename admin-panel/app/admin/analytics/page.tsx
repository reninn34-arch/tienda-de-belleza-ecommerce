"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface Product { id: string; name: string; price: number; category: string; cost?: number; totalStock?: number; image?: string; }
interface OrderProduct { id: string; productId?: string; name: string; price: number; quantity: number; }
interface Order { id: string; customer: string; total: number; status: string; date: string; items: number; paymentMethod: string; products?: OrderProduct[]; branchId?: string; }
interface Branch { id: string; name: string; }

const STATUS_LABEL: Record<string, string> = {
  completed: "Completado", pending: "Pendiente", processing: "En proceso",
  cancelled: "Cancelado", refunded: "Reembolsado",
};
const STATUS_CHART_COLOR: Record<string, string> = {
  completed: "#10b981", pending: "#f59e0b", processing: "#6366f1",
  cancelled: "#ef4444", refunded: "#a855f7",
};
const PAYMENT_LABEL: Record<string, string> = { transfer: "Transferencia", cash: "Efectivo", card: "Tarjeta" };
const PAYMENT_ICON: Record<string, string> = { transfer: "account_balance", cash: "payments", card: "credit_card" };
const PAYMENT_STYLE: Record<string, { bg: string; pill: string; accent: string; border: string }> = {
  transfer: { bg: "bg-blue-50", pill: "bg-blue-100 text-blue-700", accent: "#3b82f6", border: "border-blue-100" },
  cash:     { bg: "bg-emerald-50", pill: "bg-emerald-100 text-emerald-700", accent: "#10b981", border: "border-emerald-100" },
  card:     { bg: "bg-violet-50", pill: "bg-violet-100 text-violet-700", accent: "#8b5cf6", border: "border-violet-100" },
};
const CAT_COLORS = ["#33172c","#6366f1","#f59e0b","#10b981","#ef4444","#a855f7","#ec4899","#06b6d4"];
const CAT_BG = ["bg-[#33172c]","bg-indigo-500","bg-amber-400","bg-emerald-500","bg-red-500","bg-purple-500","bg-pink-500","bg-cyan-500"];
const CATEGORY_ICON: Record<string, string> = {
  permanent: "palette", "semi-permanent": "water_drop", treatment: "spa",
  accessories: "diamond", tools: "hardware", color: "palette",
};
const PERIOD_MAP = {
  "today": { label: "Hoy", days: 1 },
  "7d": { label: "7 días", days: 7 },
  "14d": { label: "14 días", days: 14 },
  "30d": { label: "1 mes", days: 30 },
  "90d": { label: "3 meses", days: 90 },
  "180d": { label: "6 meses", days: 180 },
  "365d": { label: "1 año", days: 365 },
  "always": { label: "Siempre", days: 0 },
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

function TrendBadge({ cur, prev, visible }: { cur: number; prev: number; visible: boolean }) {
  if (!visible || prev === 0) return null;
  const pct = ((cur - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
      <span className="material-symbols-outlined text-[12px]">{up ? "arrow_upward" : "arrow_downward"}</span>
      {Math.abs(pct).toFixed(0)}%
    </div>
  );
}

export default function AnalyticsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [range, setRange] = useState<PeriodKey>("30d");
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [profitSort, setProfitSort] = useState<"profit" | "margin" | "units">("profit");
  const [showNoSalesDetail, setShowNoSalesDetail] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const fetchData = async () => {
      const [p, o, b] = await Promise.all([
        fetch("/api/admin/products").then((r) => r.json()),
        fetch("/api/admin/orders").then((r) => r.json()),
        fetch("/api/admin/branches").then((r) => r.json()),
      ]);
      if (!alive) return;
      setProducts(p);
      setOrders(o);
      setBranches(b);
      setLoaded(true);
    };

    fetchData();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // ── Date range filtering ──────────────────────────────────────
  const now = new Date();
  const currentPeriodDays = PERIOD_MAP[range].days;
  
  const rangeStart = currentPeriodDays > 0 ? new Date() : null;
  if (rangeStart) {
    rangeStart.setDate(now.getDate() - currentPeriodDays);
    rangeStart.setHours(0, 0, 0, 0);
  }

  const prevStart = currentPeriodDays > 0 ? new Date() : null;
  if (prevStart) {
    prevStart.setDate(now.getDate() - (currentPeriodDays * 2));
    prevStart.setHours(0, 0, 0, 0);
  }

  const matchesBranch = (o: Order) => {
    if (!selectedBranchId) return true;
    
    // Si la sucursal seleccionada es la Tienda Online, incluimos pedidos sin branchId
    const selectedBranch = branches.find(b => b.id === selectedBranchId);
    if (selectedBranch?.name === "tienda-online" && !o.branchId) return true;
    
    return o.branchId === selectedBranchId;
  };

  const inRange = (o: Order) => matchesBranch(o) && (!rangeStart || new Date(o.date) >= rangeStart);
  const inPrev = (o: Order) =>
    matchesBranch(o) &&
    !!prevStart && !!rangeStart &&
    new Date(o.date) >= prevStart && new Date(o.date) < rangeStart;

  const rangeOrders = orders.filter(inRange);
  const prevOrders = orders.filter(inPrev);
  const activeOrders = rangeOrders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
  const prevActiveOrders = prevOrders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");

  // ── KPIs ─────────────────────────────────────────────────────
  const revenue = activeOrders.reduce((s, o) => s + o.total, 0);
  const prevRevenue = prevActiveOrders.reduce((s, o) => s + o.total, 0);
  const avgTicket = activeOrders.length > 0 ? revenue / activeOrders.length : 0;
  const prevAvgTicket = prevActiveOrders.length > 0 ? prevRevenue / prevActiveOrders.length : 0;
  const totalUnitsSold = activeOrders.reduce((s, o) => s + (o.products?.reduce((a, p) => a + p.quantity, 0) ?? 0), 0);
  const prevTotalUnitsSold = prevActiveOrders.reduce((s, o) => s + (o.products?.reduce((a, p) => a + p.quantity, 0) ?? 0), 0);
  const completedCount = rangeOrders.filter((o) => o.status === "completed").length;
  const completedRate = rangeOrders.length > 0 ? (completedCount / rangeOrders.length) * 100 : 0;
  const prevCompletedCount = prevOrders.filter((o) => o.status === "completed").length;
  const prevCompletedRate = prevOrders.length > 0 ? (prevCompletedCount / prevOrders.length) * 100 : 0;
   const showTrend = range !== "always";

  // ── Revenue trend chart ───────────────────────────────────────
  const CHART_DAYS = range === "always" ? 60 : currentPeriodDays;
  const DAY_NAMES = ["Dom","Lun","Mar","Mie","Jue","Vie","Sab"];
  const todayStr = new Date().toISOString().split("T")[0];
  const chartData = Array.from({ length: CHART_DAYS }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (CHART_DAYS - 1 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayOrders = orders.filter(
      (o) => o.status !== "cancelled" && o.status !== "refunded" && o.date.split("T")[0] === dateStr
    );
    return { date: dateStr, dayLabel: DAY_NAMES[d.getDay()], dayNum: d.getDate(),
      revenue: dayOrders.reduce((s, o) => s + o.total, 0), count: dayOrders.length };
  });
  const chartMax = Math.max(...chartData.map((d) => d.revenue), 1);
  const chartHasData = chartData.some((d) => d.revenue > 0);
  const SVG_W = 780, SVG_H = 200, PAD_L = 52, PAD_T = 20, CHART_W = 718, CHART_H = 140;
  const BASELINE = PAD_T + CHART_H;
  const xStep = CHART_W / Math.max(CHART_DAYS - 1, 1);
  const pts = chartData.map((d, i) => ({
    x: PAD_L + i * xStep, y: BASELINE - (d.revenue / chartMax) * CHART_H, ...d,
  }));
  const linePath = smoothPath(pts);
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${BASELINE} L ${pts[0].x} ${BASELINE} Z`;
  const hoveredPoint = hovered !== null ? pts[hovered] : null;
  const labelEvery = CHART_DAYS <= 14 ? 1 : CHART_DAYS <= 30 ? 3 : CHART_DAYS <= 60 ? 7 : 10;
  const dotR = CHART_DAYS > 45 ? 1.5 : 2.5;

  // ── Top Productos ─────────────────────────────────────────────
  const RANK_COLORS = ["#33172c","#4a2241","#633057","#7c3e6d","#8b5874","#a07090","#b48fa0","#c9afc0"];
  const topProducts = (() => {
    const map = new Map<string, { name: string; units: number; revenue: number }>();
    for (const o of activeOrders) for (const p of (o.products ?? [])) {
      const productId = p.productId ?? p.id;
      const prev = map.get(productId) ?? { name: p.name, units: 0, revenue: 0 };
      map.set(productId, { name: p.name, units: prev.units + p.quantity, revenue: prev.revenue + p.price * p.quantity });
    }
    return [...map.values()].sort((a, b) => b.units - a.units).slice(0, 8);
  })();
  const topMax = Math.max(...topProducts.map((p) => p.units), 1);

  // ── Rentabilidad ──────────────────────────────────────────────
  const costMap = new Map(products.map((p) => [p.id, p.cost ?? 0]));
  const categoryMap = new Map(products.map((p) => [p.id, p.category]));
  const cogs = activeOrders.reduce((s, o) =>
    s + (o.products ?? []).reduce((a, p) => a + (costMap.get(p.id) ?? 0) * p.quantity, 0), 0);
  const grossProfit = revenue - cogs;
  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const productMarginsBase = products
    .filter((p) => (p.cost ?? 0) > 0)
    .map((p) => {
      const cost = p.cost ?? 0;
      const margin = ((p.price - cost) / p.price) * 100;
      let unitsSold = 0;
      for (const o of activeOrders) for (const ip of (o.products ?? [])) {
        const productId = ip.productId ?? ip.id;
        if (productId === p.id) unitsSold += ip.quantity;
      }
      const profit = (p.price - cost) * unitsSold;
      return { id: p.id, name: p.name, price: p.price, cost, margin, unitsSold, profit, image: p.image };
    });
  const totalProductProfit = productMarginsBase.reduce((s, p) => s + Math.max(p.profit, 0), 0);
  const productMargins = [...productMarginsBase].sort((a, b) =>
    profitSort === "margin" ? b.margin - a.margin :
    profitSort === "units" ? b.unitsSold - a.unitsSold :
    b.profit - a.profit
  );
  const lossProducts = productMarginsBase.filter((p) => p.margin < 0);
  const noSalesHighMargin = productMarginsBase.filter((p) => p.margin >= 50 && p.unitsSold === 0);

  // ── Inventario ────────────────────────────────────────────────
  const inventoryCost = products.reduce((s, p) => s + (p.totalStock ?? 0) * (p.cost ?? 0), 0);
  const inventorySell = products.reduce((s, p) => s + (p.totalStock ?? 0) * p.price, 0);
  const stockItems = products.map((p) => ({ id: p.id, name: p.name, stock: p.totalStock ?? 0, cost: p.cost ?? 0, price: p.price, image: p.image })).sort((a, b) => a.stock - b.stock);
  const outOfStock = stockItems.filter((p) => p.stock === 0);
  const lowStock = stockItems.filter((p) => p.stock > 0 && p.stock <= 5);
  const healthyStock = stockItems.filter((p) => p.stock > 5);

  // ── Revenue por categoria ─────────────────────────────────────
  const catRevMap = new Map<string, { rev: number; units: number; orders: number }>();
  for (const o of activeOrders) {
    const catsInOrder = new Set<string>();
    for (const p of (o.products ?? [])) {
      const productId = p.productId ?? p.id;
      const cat = categoryMap.get(productId) ?? "Otro";
      const prev = catRevMap.get(cat) ?? { rev: 0, units: 0, orders: 0 };
      catRevMap.set(cat, { rev: prev.rev + p.price * p.quantity, units: prev.units + p.quantity, orders: prev.orders });
      catsInOrder.add(cat);
    }
    for (const cat of catsInOrder) {
      const prev = catRevMap.get(cat)!;
      catRevMap.set(cat, { ...prev, orders: prev.orders + 1 });
    }
  }
  const catRevData = [...catRevMap.entries()]
    .sort((a, b) => b[1].rev - a[1].rev)
    .map(([cat, d]) => ({ cat, ...d, avg: d.rev / Math.max(d.orders, 1) }));

  // ── Ingresos por sucursal ─────────────────────────────────────
  const branchMap = new Map(branches.map(b => [b.id, b.name]));
  const branchRevenueMap = new Map<string, { total: number, count: number }>();
  for (const o of activeOrders) {
    let actualName = branchMap.get(o.branchId ?? "") ?? "Tienda Online";
    if (actualName.toLowerCase() === "tienda-online") actualName = "Tienda Online";
    const prev = branchRevenueMap.get(actualName) ?? { total: 0, count: 0 };
    branchRevenueMap.set(actualName, { total: prev.total + o.total, count: prev.count + 1 });
  }
  const branchData = [...branchRevenueMap.entries()]
    .sort((a,b) => b[1].total - a[1].total)
    .map(([name, d]) => ({ 
      name, total: d.total, count: d.count, 
      share: revenue > 0 ? (d.total / revenue) * 100 : 0 
    }));

  // ── Desglose de productos por categoria ──────────────────────
  const productImageMap = new Map(productMarginsBase.map((p) => [p.id, p.image]));
  const catProductsMap = new Map<string, { id: string; name: string; image?: string; units: number; rev: number }[]>();
  for (const o of activeOrders) {
    for (const p of (o.products ?? [])) {
      const productId = p.productId ?? p.id;
      const cat = categoryMap.get(productId) ?? "Otro";
      const arr = catProductsMap.get(cat) ?? [];
      const existing = arr.find((x) => x.id === productId);
      if (existing) { existing.units += p.quantity; existing.rev += p.price * p.quantity; }
      else { arr.push({ id: productId, name: p.name, image: productImageMap.get(productId), units: p.quantity, rev: p.price * p.quantity }); catProductsMap.set(cat, arr); }
    }
  }
  for (const [cat, arr] of catProductsMap) catProductsMap.set(cat, [...arr].sort((a, b) => b.rev - a.rev));

  // ── Pedidos por metodo de pago ────────────────────────────────
  const paymentOrdersMap = new Map<string, Order[]>();
  for (const o of activeOrders) {
    const key = o.paymentMethod ?? "other";
    paymentOrdersMap.set(key, [...(paymentOrdersMap.get(key) ?? []), o]);
  }

  // ── Ticket por metodo de pago ─────────────────────────────────
  const paymentGroups = new Map<string, { total: number; count: number }>();
  for (const o of activeOrders) {
    const key = o.paymentMethod ?? "other";
    const prev = paymentGroups.get(key) ?? { total: 0, count: 0 };
    paymentGroups.set(key, { total: prev.total + o.total, count: prev.count + 1 });
  }
  const paymentData = [...paymentGroups.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([method, g]) => ({
      method, label: PAYMENT_LABEL[method] ?? method, icon: PAYMENT_ICON[method] ?? "payment",
      avg: g.total / g.count, total: g.total, count: g.count,
      share: activeOrders.length > 0 ? (g.count / activeOrders.length) * 100 : 0,
    }));

  // ── Estado de pedidos (donut) ─────────────────────────────────
  const donutTotal = rangeOrders.length || 1;
  const donutSegs: { status: string; count: number; a1: number; a2: number }[] = [];
  let donutAngle = 0;
  for (const s of ["completed", "pending", "processing", "cancelled", "refunded"]) {
    const count = rangeOrders.filter((o) => o.status === s).length;
    if (count > 0) {
      const sweep = (count / donutTotal) * 360;
      donutSegs.push({ status: s, count, a1: donutAngle, a2: donutAngle + sweep });
      donutAngle += sweep;
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analitica</h1>
          <p className="text-sm text-gray-500 mt-1">Rentabilidad, inventario y metricas de venta</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Range selector (Dashboard-style) */}
          <div className="bg-white border border-gray-100 rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-400 text-sm">calendar_today</span>
              <select 
                value={range}
                onChange={(e) => { setRange(e.target.value as PeriodKey); setHovered(null); }}
                className="bg-transparent text-[11px] font-bold text-gray-600 outline-none cursor-pointer pr-1"
              >
                  {Object.entries(PERIOD_MAP).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
              </select>
          </div>
          {/* Branch selector */}
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-gray-400">storefront</span>
            <select
              value={selectedBranchId ?? ""}
              onChange={(e) => setSelectedBranchId(e.target.value || null)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[11px] font-bold text-[#33172c] focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none shadow-sm min-w-[140px]"
            >
              <option value="">Todas las sucursales</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name === "tienda-online" ? "Tienda Online" : b.name}
                </option>
              ))}
            </select>
          </div>

          <Link href="/admin" className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#33172c] transition-colors">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Dashboard
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Ingresos", icon: "payments", color: "text-emerald-600 bg-emerald-50",
            value: loaded ? `$${revenue.toFixed(2)}` : "—", cur: revenue, prev: prevRevenue },
          { label: "Ticket Promedio", icon: "receipt", color: "text-teal-600 bg-teal-50",
            value: loaded && activeOrders.length > 0 ? `$${avgTicket.toFixed(2)}` : "—", cur: avgTicket, prev: prevAvgTicket },
          { label: "Articulos Vendidos", icon: "shopping_bag", color: "text-indigo-600 bg-indigo-50",
            value: loaded ? (totalUnitsSold || "—") : "—", cur: totalUnitsSold, prev: prevTotalUnitsSold },
          { label: "Tasa de Exito", icon: "verified", color: "text-violet-600 bg-violet-50",
            value: loaded && rangeOrders.length > 0 ? `${completedRate.toFixed(0)}%` : "—", cur: completedRate, prev: prevCompletedRate },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.color}`}>
                <span className="material-symbols-outlined text-[20px]">{kpi.icon}</span>
              </div>
              {loaded && <TrendBadge cur={kpi.cur} prev={kpi.prev} visible={showTrend} />}
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mt-1">{kpi.label}</div>
            {showTrend && <div className="text-[9px] text-gray-500 mt-0.5">vs periodo anterior</div>}
          </div>
        ))}
      </div>

      {/* Revenue trend chart */}
      {loaded && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest">Tendencia de Ingresos</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Vista: {PERIOD_MAP[range].label} · sin cancelados ni reembolsos
              </p>
            </div>
            {chartHasData && (
              <div className="text-right">
                <p className="text-xl font-bold text-[#33172c]">${revenue.toFixed(2)}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">total en el periodo</p>
              </div>
            )}
          </div>
          {!chartHasData ? (
            <div className="flex flex-col items-center justify-center h-52 gap-3">
              <span className="material-symbols-outlined text-5xl text-gray-200">show_chart</span>
              <p className="text-sm text-gray-500">Sin ventas en el periodo seleccionado</p>
            </div>
          ) : (
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H + 30}`} className="w-full select-none"
              style={{ cursor: "crosshair" }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const svgX = ((e.clientX - rect.left) / rect.width) * SVG_W;
                const idx = Math.round((svgX - PAD_L) / xStep);
                setHovered(Math.max(0, Math.min(CHART_DAYS - 1, idx)));
              }}
              onMouseLeave={() => setHovered(null)}>
              <defs>
                <linearGradient id="aGrad2" x1="0" y1="0" x2="0" y2="1">
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
              <path d={areaPath} fill="url(#aGrad2)" />
              <path d={linePath} fill="none" stroke="#33172c" strokeWidth={2} strokeLinecap="round" />
              {pts.filter((_, i) => {
                if (CHART_DAYS <= 14) return true;
                if (CHART_DAYS <= 60) return i % 5 === 0;
                if (CHART_DAYS <= 180) return i % 15 === 0;
                return i % 30 === 0;
              }).map((p) => (
                <text key={p.date} x={p.x} y={BASELINE + 20} textAnchor="middle" fontSize={9}
                  fill={p.date === todayStr ? "#33172c" : "#9ca3af"}
                  fontWeight={p.date === todayStr ? "700" : "400"}>
                  {p.dayLabel} {p.dayNum}
                </text>
              ))}
              {pts.map((p) => p.revenue > 0 ? (
                <circle key={p.date} cx={p.x} cy={p.y} r={dotR}
                  fill={p.date === todayStr ? "#33172c" : "#c4a0bb"} stroke="white" strokeWidth={1} />
              ) : null)}
              {hoveredPoint && (() => {
                const tipW = 112, tipH = 58;
                const tipX = hoveredPoint.x + tipW + 14 > SVG_W ? hoveredPoint.x - tipW - 8 : hoveredPoint.x + 8;
                const tipY = Math.max(PAD_T, Math.min(hoveredPoint.y - tipH / 2, BASELINE - tipH));
                const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(2)}k` : `$${v.toFixed(2)}`;
                return (
                  <g>
                    <line x1={hoveredPoint.x} y1={PAD_T} x2={hoveredPoint.x} y2={BASELINE}
                      stroke="#33172c" strokeWidth={1} strokeDasharray="3 3" opacity={0.3} />
                    <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r={7} fill="#33172c" opacity={0.10} />
                    <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r={4} fill="#33172c" />
                    <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r={2} fill="white" />
                    <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={8} fill="#1c0f19" />
                    <text x={tipX + tipW / 2} y={tipY + 16} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.45)">{hoveredPoint.date}</text>
                    <text x={tipX + tipW / 2} y={tipY + 37} textAnchor="middle" fontSize={16} fill="white" fontWeight="700">{fmt(hoveredPoint.revenue)}</text>
                    <text x={tipX + tipW / 2} y={tipY + 52} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.35)">
                      {hoveredPoint.count} {hoveredPoint.count === 1 ? "pedido" : "pedidos"}
                    </text>
                  </g>
                );
              })()}
            </svg>
          )}
        </div>
      )}

      {/* Top Productos + Estado pedidos */}
      {loaded && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest">Top Productos</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Por unidades vendidas · periodo seleccionado</p>
              </div>
              <Link href="/admin/products" className="text-xs text-[#33172c] hover:underline font-medium">Ver catalogo</Link>
            </div>
            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <span className="material-symbols-outlined text-5xl text-gray-200">bar_chart</span>
                <p className="text-sm text-gray-500">Sin ventas en el periodo</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {topProducts.map((p, i) => (
                  <div key={`${p.name}-${i}`} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-gray-500 w-4 text-right flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-semibold text-gray-700 truncate pr-2">{p.name}</span>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-[10px] text-gray-500">{p.units} uds.</span>
                          <span className="text-xs font-bold text-gray-800">${p.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(p.units / topMax) * 100}%`, background: RANK_COLORS[i] ?? "#c9afc0" }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
            <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Estado de Pedidos</h2>
            <p className="text-[11px] text-gray-500 mb-4">Distribucion · periodo seleccionado</p>
            {rangeOrders.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined text-5xl text-gray-200">donut_large</span>
                <p className="text-sm text-gray-500">Sin pedidos en el periodo</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5">
                <svg viewBox="0 0 200 200" className="w-36 h-36">
                  {donutSegs.map((seg) => (
                    <path key={seg.status}
                      d={arcPath(100, 100, 72, 50, seg.a1, Math.max(seg.a1 + 2, seg.a2 - (donutSegs.length > 1 ? 2 : 0)))}
                      fill={STATUS_CHART_COLOR[seg.status] ?? "#e5e7eb"} />
                  ))}
                  <text x="100" y="97" textAnchor="middle" fontSize="24" fontWeight="800" fill="#1f2937">{rangeOrders.length}</text>
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

      {/* Ventas por Sucursal + Metodos de Pago */}
      {loaded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Ventas por Sucursal</h2>
            <p className="text-[11px] text-gray-500 mb-5">Ingresos generados por cada local y tienda online</p>
            {branchData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <span className="material-symbols-outlined text-4xl text-gray-200">storefront</span>
                <p className="text-sm text-gray-500">Sin ingresos en el periodo</p>
              </div>
            ) : (
              <div className="space-y-4">
                {branchData.map((b, i) => {
                  const isSelected = selectedBranchId ? (branchMap.get(selectedBranchId) === b.name || (selectedBranchId && b.name === "Tienda Online" && branchMap.get(selectedBranchId) === "tienda-online")) : false;
                  return (
                    <div key={b.name} className={`flex items-center gap-4 transition-all ${isSelected ? "p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 shadow-sm" : ""}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${b.name === "Tienda Online" ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"}`}>
                        <span className="material-symbols-outlined text-[20px]">{b.name === "Tienda Online" ? "language" : "storefront"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className={`text-sm font-semibold truncate ${isSelected ? "text-indigo-900" : "text-gray-800"}`}>{b.name}</span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-[#33172c]">${b.total.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${b.name === "Tienda Online" ? "bg-indigo-500" : "bg-emerald-500"}`} style={{ width: `${b.share}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-500 w-8 text-right flex-shrink-0">{b.share.toFixed(0)}%</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">{b.count} {b.count === 1 ? "pedido" : "pedidos"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Métodos de Pago</h2>
            <p className="text-[11px] text-gray-500 mb-5">Ingresos por pasarela o efectivo</p>
            {paymentData.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-32 gap-2">
                 <span className="material-symbols-outlined text-4xl text-gray-200">payments</span>
                 <p className="text-sm text-gray-500">Sin pagos en el periodo</p>
               </div>
            ) : (
              <div className="space-y-4">
                {paymentData.map((p) => {
                  const style = PAYMENT_STYLE[p.method] ?? PAYMENT_STYLE.cash;
                  return (
                    <div key={p.method} className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color: style.accent }}>{p.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-semibold text-gray-800 tracking-wide">{p.label}</span>
                          <span className="text-sm font-bold text-[#33172c]">${p.total.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.share}%`, backgroundColor: style.accent }} />
                          </div>
                          <span className="text-[10px] text-gray-500 w-8 text-right flex-shrink-0">{p.share.toFixed(0)}%</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">{p.count} {p.count === 1 ? "pedido" : "pedidos"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rentabilidad + Inventario */}
      {loaded && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest">Rentabilidad</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Por producto · periodo seleccionado</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-emerald-600">${grossProfit.toFixed(2)}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{grossMarginPct.toFixed(1)}% margen bruto</p>
              </div>
            </div>

            {/* Resumen financiero */}
            <div className="relative mb-5">
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: "Ingresos", value: `$${revenue.toFixed(2)}`, color: "text-gray-800", bg: "bg-gray-50" },
                  { label: "Costo Vendido", value: `-$${cogs.toFixed(2)}`, color: "text-red-500", bg: "bg-red-50" },
                  { label: "Ganancia Bruta", value: `$${grossProfit.toFixed(2)}`, color: grossProfit >= 0 ? "text-emerald-600" : "text-red-600", bg: grossProfit >= 0 ? "bg-emerald-50" : "bg-red-50" },
                ].map((k) => (
                  <div key={k.label} className={`${k.bg} rounded-xl p-3 text-center`}>
                    <p className={`text-base font-bold ${k.color}`}>{k.value}</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>
              {/* Waterfall bar */}
              {revenue > 0 && (
                <div className="h-2.5 rounded-full overflow-hidden flex bg-gray-100">
                  <div className="h-full bg-emerald-400 transition-all duration-700" style={{ width: `${grossMarginPct}%` }} title={`Ganancia ${grossMarginPct.toFixed(1)}%`} />
                  <div className="h-full bg-red-300 transition-all duration-700" style={{ width: `${cogs / revenue * 100}%` }} title={`Costo ${(cogs / revenue * 100).toFixed(1)}%`} />
                </div>
              )}
              {revenue > 0 && (
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-emerald-500 font-semibold">Ganancia {grossMarginPct.toFixed(1)}%</span>
                  <span className="text-[9px] text-red-400">Costo {revenue > 0 ? (cogs / revenue * 100).toFixed(1) : 0}%</span>
                </div>
              )}
            </div>

            {/* Alertas */}
            {lossProducts.length > 0 && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mb-4">
                <span className="material-symbols-outlined text-[16px] text-red-500 mt-0.5 flex-shrink-0">warning</span>
                <p className="text-[11px] text-red-600 font-semibold">
                  {lossProducts.length} producto{lossProducts.length > 1 ? "s" : ""} vendiendo a perdida:{" "}
                  <span className="font-bold">{lossProducts.map((p) => p.name).join(", ")}</span>
                </p>
              </div>
            )}
            {noSalesHighMargin.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl mb-4 overflow-hidden">
                <button
                  onClick={() => setShowNoSalesDetail((v) => !v)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-amber-100/60 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[16px] text-amber-500 flex-shrink-0">lightbulb</span>
                  <p className="text-[11px] text-amber-700 flex-1">
                    <span className="font-bold">{noSalesHighMargin.length} producto{noSalesHighMargin.length > 1 ? "s" : ""}</span> con margen &gt;50% sin ventas en el periodo.{" "}
                    <span className="underline decoration-dotted">Considera promocionarlos.</span>
                  </p>
                  <span className={`material-symbols-outlined text-[14px] text-amber-400 transition-transform flex-shrink-0 ${showNoSalesDetail ? "rotate-180" : ""}`}>
                    expand_more
                  </span>
                </button>
                {showNoSalesDetail && (
                  <div className="px-3 pb-3 flex flex-col gap-2">
                    {noSalesHighMargin.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-amber-100 shadow-sm">
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt={p.name}
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-md object-cover flex-shrink-0 border border-amber-100"
                            sizes="36px"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-[18px] text-amber-400">inventory_2</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-gray-700 truncate">{p.name}</p>
                          <p className="text-[10px] text-gray-500">${p.price.toFixed(2)} &mdash; costo ${p.cost.toFixed(2)}</p>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-600 flex-shrink-0">{p.margin.toFixed(0)}% margen</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sort toggle + tabla */}
            {productMargins.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 gap-2">
                <span className="material-symbols-outlined text-4xl text-gray-200">trending_up</span>
                <p className="text-sm text-gray-500">Agrega costos a tus productos para ver el margen</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ordenar por</span>
                  <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                    {(["profit", "margin", "units"] as const).map((s) => (
                      <button key={s} onClick={() => setProfitSort(s)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                          profitSort === s ? "bg-white text-[#33172c] shadow-sm" : "text-gray-500 hover:text-gray-600"
                        }`}>
                        {s === "profit" ? "Ganancia $" : s === "margin" ? "Margen %" : "Unidades"}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Column headers */}
                <div className="flex items-center gap-2 px-1 mb-1.5">
                  <span className="w-4 flex-shrink-0" />
                  <span className="flex-1 text-[9px] font-bold text-gray-500 uppercase tracking-wider">Producto</span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider w-16 text-right flex-shrink-0">Ganancia</span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider w-10 text-right flex-shrink-0">Margen</span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider w-8 text-right flex-shrink-0">Uds.</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {productMargins.map((p, i) => {
                    const profitShare = totalProductProfit > 0 ? (Math.max(p.profit, 0) / totalProductProfit) * 100 : 0;
                    const isLoss = p.margin < 0;
                    const tierLabel = isLoss ? "Pérdida" : p.margin >= 50 ? "Excelente" : p.margin >= 30 ? "Bueno" : "Bajo";
                    const tierColor = isLoss
                      ? "bg-red-100 text-red-600 border-red-200"
                      : p.margin >= 50 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : p.margin >= 30 ? "bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-orange-100 text-orange-700 border-orange-200";
                    const barColor = isLoss ? "#ef4444" : p.margin >= 50 ? "#10b981" : p.margin >= 30 ? "#f59e0b" : "#fb923c";
                    return (
                      <Link key={p.id} href={`/admin/products/${p.id}`}
                        className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-[#33172c]/20 hover:bg-gray-50/50 transition-all group">
                        {/* Imagen */}
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                          {p.image ? (
                            <Image
                              src={p.image}
                              alt={p.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              sizes="56px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-[20px] text-gray-500">inventory_2</span>
                            </div>
                          )}
                        </div>

                        {/* Info central */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-gray-500">#{i + 1}</span>
                            <span className="text-sm font-semibold text-gray-800 truncate group-hover:text-[#33172c] transition-colors">{p.name}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${tierColor}`}>{tierLabel}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-2">
                            <span>Costo <strong className="text-gray-600">${p.cost}</strong></span>
                            <span className="text-gray-200">→</span>
                            <span>Precio <strong className="text-gray-600">${p.price}</strong></span>
                            {p.unitsSold > 0 && (
                              <span className="text-gray-500">·</span>
                            )}
                            {p.unitsSold > 0 && (
                              <span>{p.unitsSold} ud. vendidas</span>
                            )}
                          </div>
                          {/* Margin bar */}
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: isLoss ? "100%" : `${Math.min(p.margin, 100)}%`, background: barColor }} />
                          </div>
                          {profitShare > 0 && (
                            <div className="mt-1 h-1 bg-gray-50 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-300 rounded-full transition-all duration-700" style={{ width: `${profitShare}%` }} />
                            </div>
                          )}
                        </div>

                        {/* Métricas derecha */}
                        <div className="flex-shrink-0 text-right">
                          <div className={`text-base font-bold ${isLoss ? "text-red-500" : "text-emerald-600"}`}>
                            {isLoss ? "-" : "+"}${Math.abs(p.profit).toFixed(0)}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">ganancia</div>
                          <div className={`text-sm font-bold mt-1 ${isLoss ? "text-red-400" : p.margin >= 50 ? "text-emerald-600" : p.margin >= 30 ? "text-amber-600" : "text-orange-500"}`}>
                            {p.margin.toFixed(0)}%
                          </div>
                          <div className="text-[10px] text-gray-500">margen</div>
                          {profitShare > 0 && (
                            <div className="text-[9px] text-emerald-500 font-semibold mt-1">{profitShare.toFixed(0)}% del profit</div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50">
                  {[
                    { color: "bg-emerald-400", label: "Margen ≥50%" },
                    { color: "bg-amber-400", label: "30–49%" },
                    { color: "bg-orange-400", label: "<30%" },
                    { color: "bg-red-400", label: "Perdida" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${l.color}`} />
                      <span className="text-[9px] text-gray-500">{l.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col gap-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Inventario</h2>
                <p className="text-[11px] text-gray-500">Estado del stock actual</p>
              </div>
              <Link href="/admin/products" className="text-xs text-[#33172c] hover:underline font-medium">Gestionar</Link>
            </div>

            {/* Valor del inventario */}
            <div className="bg-gradient-to-br from-[#33172c]/5 to-[#33172c]/10 rounded-2xl p-4 border border-[#33172c]/10">
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Valor total del stock</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">${inventorySell.toFixed(0)}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">a precio de venta</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">+${(inventorySell - inventoryCost).toFixed(0)}</p>
                  <p className="text-[9px] text-gray-500">margen potencial</p>
                </div>
              </div>
              {/* Stacked gauge */}
              {products.length > 0 && (
                <div className="mt-3">
                  <div className="h-2 rounded-full overflow-hidden flex gap-0.5">
                    {healthyStock.length > 0 && <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(healthyStock.length / products.length) * 100}%` }} />}
                    {lowStock.length > 0 && <div className="h-full bg-amber-400 transition-all" style={{ width: `${(lowStock.length / products.length) * 100}%` }} />}
                    {outOfStock.length > 0 && <div className="h-full bg-red-400 transition-all" style={{ width: `${(outOfStock.length / products.length) * 100}%` }} />}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[9px] text-emerald-600 font-semibold">{healthyStock.length} OK</span>
                    <span className="text-[9px] text-amber-600 font-semibold">{lowStock.length} bajo</span>
                    <span className="text-[9px] text-red-500 font-semibold">{outOfStock.length} agotado</span>
                  </div>
                </div>
              )}
            </div>

            {/* Lista productos urgentes con imagen */}
            {(outOfStock.length > 0 || lowStock.length > 0) ? (
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Requieren atención</p>
                <div className="space-y-2">
                  {[...outOfStock.slice(0, 2), ...lowStock.slice(0, 3)].map((p) => {
                    const isOut = p.stock === 0;
                    return (
                      <Link key={p.id} href={`/admin/products/${p.id}`}
                        className="flex items-center gap-3 p-2 rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50/30 transition-all group">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {p.image ? (
                            <Image
                              src={p.image}
                              alt={p.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-[14px] text-gray-500">inventory_2</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate group-hover:text-[#33172c] transition-colors">{p.name}</p>
                          <p className="text-[9px] text-gray-500">
                            ${p.price} · costo ${p.cost > 0 ? `$${p.cost}` : "—"}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                          isOut ? "bg-red-100 text-red-600" : p.stock <= 2 ? "bg-red-50 text-red-400" : "bg-amber-100 text-amber-600"
                        }`}>
                          {isOut ? "Agotado" : `${p.stock} uds.`}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <span className="material-symbols-outlined text-3xl text-emerald-300">inventory</span>
                <p className="text-xs text-emerald-600 font-semibold">Todo el stock está en buen estado</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revenue por categoria */}
      {loaded && catRevData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest">Ingresos por Categoría</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Distribución de ventas · periodo seleccionado</p>
            </div>
            {catRevData[0] && (
              <div className="flex items-center gap-1.5 bg-[#33172c]/5 border border-[#33172c]/15 rounded-xl px-3 py-1.5">
                <span className="material-symbols-outlined text-[14px] text-[#33172c]">star</span>
                <span className="text-[10px] font-bold text-[#33172c] capitalize">{catRevData[0].cat} lidera</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catRevData.map(({ cat, rev, units, avg }, i) => {
              const share = revenue > 0 ? (rev / revenue) * 100 : 0;
              const isTop = i === 0;
              const color = CAT_COLORS[i % CAT_COLORS.length];
              const bg = CAT_BG[i % CAT_BG.length];
              const icon = CATEGORY_ICON[cat.toLowerCase()] ?? "category";
              const isExpanded = expandedCat === cat;
              const catProducts = catProductsMap.get(cat) ?? [];
              return (
                <div key={cat} className={`relative rounded-2xl border overflow-hidden transition-all ${
                  isTop ? "border-[#33172c]/20 bg-[#33172c]/5" : "border-gray-100 bg-gray-50/50"
                }`}>
                  <button
                    onClick={() => setExpandedCat(isExpanded ? null : cat)}
                    className="w-full text-left p-5 cursor-pointer"
                  >
                    {isTop && (
                      <div className="absolute top-3 right-3">
                        <span className="material-symbols-outlined text-[16px]" style={{ color }}>star</span>
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${bg} border`} style={{ borderColor: color + "33" }}>
                      <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800 capitalize mb-0.5">{cat}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">${rev.toFixed(0)}</p>
                    <p className="text-[10px] text-gray-500 mb-3">ingresos totales del periodo</p>
                    <div className="h-1 bg-white/60 rounded-full overflow-hidden mb-3">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${share}%`, background: color }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="rounded-xl p-2 text-center" style={{ background: color + "15" }}>
                        <p className="text-sm font-bold" style={{ color }}>{share.toFixed(0)}%</p>
                        <p className="text-[8px] text-gray-500 uppercase tracking-wide mt-0.5">del total</p>
                      </div>
                      <div className="rounded-xl p-2 text-center" style={{ background: color + "15" }}>
                        <p className="text-sm font-bold" style={{ color }}>${avg.toFixed(0)}</p>
                        <p className="text-[8px] text-gray-500 uppercase tracking-wide mt-0.5">ticket avg</p>
                      </div>
                      <div className="rounded-xl p-2 text-center" style={{ background: color + "15" }}>
                        <p className="text-sm font-bold" style={{ color }}>{units}</p>
                        <p className="text-[8px] text-gray-500 uppercase tracking-wide mt-0.5">unidades</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-black/5">
                      <span className="text-[10px] text-gray-500">{catProducts.length} producto{catProducts.length !== 1 ? "s" : ""} vendidos</span>
                      <span className={`material-symbols-outlined text-[16px] text-gray-500 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>expand_more</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 flex flex-col gap-2 border-t border-black/5 pt-3">
                      {catProducts.map((p) => {
                        const pShare = rev > 0 ? (p.rev / rev) * 100 : 0;
                        return (
                          <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-sm">
                            {p.image ? (
                              <Image
                                src={p.image}
                                alt={p.name}
                                width={36}
                                height={36}
                                className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                                sizes="36px"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + "20" }}>
                                <span className="material-symbols-outlined text-[16px]" style={{ color }}>{icon}</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-gray-700 truncate">{p.name}</p>
                              <p className="text-[9px] text-gray-500">{p.units} ud · {pShare.toFixed(0)}% del ingreso</p>
                            </div>
                            <span className="text-[11px] font-bold text-gray-700 flex-shrink-0">${p.rev.toFixed(0)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ticket por metodo de pago */}
      {loaded && paymentData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest">Métodos de Pago</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Rendimiento por método · periodo seleccionado</p>
            </div>
            {paymentData[0] && (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
                <span className="material-symbols-outlined text-[14px] text-emerald-500">star</span>
                <span className="text-[10px] font-bold text-emerald-700">{paymentData[0].label} lidera</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentData.map(({ method, label, icon, avg, total, count, share }, i) => {
              const style = PAYMENT_STYLE[method] ?? { bg: "bg-gray-50", pill: "bg-gray-100 text-gray-600", accent: "#6b7280", border: "border-gray-100" };
              const totalMax = paymentData[0].total;
              const isExpanded = expandedPayment === method;
              const methodOrders = (paymentOrdersMap.get(method) ?? []).slice(0, 5);
              return (
                <div key={method} className={`relative rounded-2xl border overflow-hidden ${i === 0 ? style.border + " " + style.bg : "border-gray-100 bg-gray-50/50"} transition-all`}>
                  <button
                    onClick={() => setExpandedPayment(isExpanded ? null : method)}
                    className="w-full text-left p-5 cursor-pointer"
                  >
                    {i === 0 && (
                      <div className="absolute top-3 right-3">
                        <span className="material-symbols-outlined text-[16px]" style={{ color: style.accent }}>star</span>
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${style.bg} border ${style.border}`}>
                      <span className="material-symbols-outlined text-[20px]" style={{ color: style.accent }}>{icon}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800 mb-0.5">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">${total.toFixed(0)}</p>
                    <p className="text-[10px] text-gray-500 mb-3">ingresos totales</p>
                    <div className="h-1 bg-white/60 rounded-full overflow-hidden mb-3">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(total / totalMax) * 100}%`, background: style.accent }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className={`rounded-xl p-2 text-center ${style.bg}`}>
                        <p className="text-sm font-bold" style={{ color: style.accent }}>${avg.toFixed(0)}</p>
                        <p className="text-[8px] text-gray-500 uppercase tracking-wide mt-0.5">ticket avg</p>
                      </div>
                      <div className={`rounded-xl p-2 text-center ${style.bg}`}>
                        <p className="text-sm font-bold" style={{ color: style.accent }}>{count}</p>
                        <p className="text-[8px] text-gray-500 uppercase tracking-wide mt-0.5">{share.toFixed(0)}% pedidos</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-black/5">
                      <span className="text-[10px] text-gray-500">Ver últimos {Math.min(count, 5)} pedidos</span>
                      <span className={`material-symbols-outlined text-[16px] text-gray-500 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>expand_more</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 flex flex-col gap-2 border-t border-black/5 pt-3">
                      {methodOrders.map((o) => (
                        <div key={o.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-sm">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: style.accent + "20" }}>
                            <span className="material-symbols-outlined text-[14px]" style={{ color: style.accent }}>receipt</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-gray-700 truncate">{o.customer}</p>
                            <p className="text-[9px] text-gray-500">{o.id} · {o.date}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-[11px] font-bold text-gray-700">${o.total.toFixed(0)}</span>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${
                              o.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                              o.status === "pending" ? "bg-amber-100 text-amber-700" :
                              o.status === "cancelled" ? "bg-red-100 text-red-600" :
                              "bg-gray-100 text-gray-600"
                            }`}>{o.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loaded && orders.length === 0 && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <span className="material-symbols-outlined text-7xl text-gray-200">analytics</span>
          <p className="text-gray-500 font-medium">No hay datos suficientes para mostrar analitica</p>
          <p className="text-sm text-gray-500">Agrega productos y espera los primeros pedidos</p>
        </div>
      )}
    </div>
  );
}




