"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Order {
  id: string;
  customer: string;
  email: string;
  total: number;
  status: string;
  date: string;
  items: number;
  paymentMethod: string;
  shippingMethod: string;
}

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
const PAYMENT_ICON: Record<string, string> = {
  card: "credit_card",
  transfer: "account_balance",
  paypal: "payment",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      if (res.ok) {
        setOrders(data);
      }
      setLoading(false);
    };

    fetchOrders();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchOrders();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const filtered = orders.filter((o) => {
    const matchStatus = filter === "all" || o.status === filter;
    const matchSearch = o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const revenue = orders
    .filter((o) => o.status !== "cancelled" && o.status !== "refunded")
    .reduce((s, o) => s + o.total, 0);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-400 mt-1">{orders.length} pedidos · Ingresos: ${revenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-0 sm:min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[18px]">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pedido o cliente..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
          />
        </div>
        <div className="overflow-x-auto flex-shrink-0">
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 min-w-max">
            {["all", "pending", "processing", "completed", "cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === s ? "bg-[#33172c] text-white" : "text-gray-400 hover:text-gray-700"
                }`}
              >
                {s === "all" ? "Todos" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-7 h-7 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No hay pedidos con estos filtros.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Pedido</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hidden md:table-cell">Fecha</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hidden lg:table-cell">Pago</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Total</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Estado</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((order, i) => (
                <tr key={order.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i === filtered.length - 1 ? "border-0" : ""}`}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900">{order.customer}</p>
                    <p className="text-xs text-gray-400">{order.id}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-500 hidden md:table-cell">{order.date}</td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <span className="material-symbols-outlined text-[16px]">{PAYMENT_ICON[order.paymentMethod] ?? "payments"}</span>
                      {order.paymentMethod === "card" ? "Tarjeta" : order.paymentMethod === "transfer" ? "Transferencia" : "PayPal"}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold text-gray-900">${order.total.toFixed(2)}</td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Link href={`/admin/orders/${order.id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-[#33172c] inline-flex">
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
