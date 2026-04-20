"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface OrderProduct { id: string; name: string; price: number; quantity: number; image?: string; isBundle?: boolean; isComponent?: boolean; }
interface Order {
  id: string;
  customer: string;
  email: string;
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  status: string;
  date: string;
  items: number;
  paymentMethod: string;
  shippingMethod: string;
  address: string;
  notes: string;
  products: OrderProduct[];
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  { value: "processing", label: "En proceso", color: "bg-blue-100 text-blue-700" },
  { value: "completed", label: "Completado", color: "bg-emerald-100 text-emerald-700" },
  { value: "cancelled", label: "Cancelado", color: "bg-red-100 text-red-700" },
  { value: "refunded", label: "Reembolsado", color: "bg-purple-100 text-purple-700" },
];

const PAYMENT_LABEL: Record<string, string> = {
  card: "Tarjeta",
  transfer: "Transferencia",
  paypal: "PayPal",
  cash: "Efectivo",
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setOrder(data);
        setStatus(data.status);
        setNotes(data.notes ?? "");
        setLoading(false);
      });
  }, [id]);

  async function refetchOrder() {
    const res = await fetch(`/api/admin/orders/${id}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message ?? data?.error ?? "Error al cargar el pedido");
    }
    setOrder(data);
    setStatus(data.status);
    setNotes(data.notes ?? "");
  }

  async function updateOrder(payload: { status?: string; notes?: string }) {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message ?? data?.error ?? "No se pudo actualizar el pedido");
    }
  }

  async function handleSaveStatus(newStatus: string) {
    setStatus(newStatus);
    setSaving(true);
    try {
      await updateOrder({ status: newStatus, notes });
      await refetchOrder();
      setToast({ msg: "Estado actualizado.", ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar el estado";
      setToast({ msg: message, ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    try {
      await updateOrder({ status, notes });
      await refetchOrder();
      setToast({ msg: "Notas guardadas.", ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron guardar las notas";
      setToast({ msg: message, ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  }

  if (loading) return <div className="p-4 sm:p-8 flex justify-center"><span className="w-7 h-7 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" /></div>;
  if (!order) return <div className="p-4 sm:p-8 text-center text-gray-400">Pedido no encontrado.</div>;

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status);

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 text-white ${
          toast.ok ? "bg-emerald-600" : "bg-red-600"
        }`}>
          <span className="material-symbols-outlined text-[16px]">{toast.ok ? "check_circle" : "error"}</span>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <span className="material-symbols-outlined text-gray-400">arrow_back</span>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{order.id}</h1>
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${currentStatus?.color}`}>
              {currentStatus?.label}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">{order.date}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order items */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Productos</h2>
            <div className="space-y-2">
              {order.products.map((p) => {
                if (p.isComponent) {
                  // Componente de un bundle: renderizar indentado y sin precio
                  return (
                    <div key={p.id} className="flex items-center gap-3 pl-6 py-1.5 border-b border-gray-50 last:border-0">
                      <div className="w-6 h-6 text-gray-300 flex items-center justify-center text-xs flex-shrink-0">
                        <span className="material-symbols-outlined text-[14px]">subdirectory_arrow_right</span>
                      </div>
                      {p.image ? (
                        <Image src={p.image} alt={p.name} width={36} height={40} className="w-9 h-10 object-cover rounded-lg shrink-0 bg-gray-100" sizes="36px" />
                      ) : (
                        <div className="w-9 h-10 rounded-lg bg-gray-50 shrink-0 flex items-center justify-center">
                          <span className="material-symbols-outlined text-gray-300 text-base">image_not_supported</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 truncate">{p.name.replace(/^\s*↳\s*Contiene:\s*/i, "")}</p>
                        <p className="text-[10px] text-gray-400">x{p.quantity}</p>
                      </div>
                    </div>
                  );
                }
                // Producto normal o cabecera de bundle
                return (
                  <div key={p.id} className={`flex items-center gap-4 py-3 border-b border-gray-50 last:border-0 ${p.isBundle ? "bg-purple-50/40 -mx-1 px-1 rounded-xl" : ""}`}>
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt={p.name}
                        width={56}
                        height={64}
                        className="w-14 h-16 object-cover rounded-lg shrink-0 bg-gray-100"
                        sizes="56px"
                      />
                    ) : (
                      <div className="w-14 h-16 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-300 text-2xl">image_not_supported</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">x{p.quantity} · ${p.price.toFixed(2)} c/u</p>
                    </div>
                    <p className="text-sm font-bold shrink-0">${(p.price * p.quantity).toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
            <div className="pt-4 mt-2 space-y-1.5 border-t border-gray-100">
              <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>${order.subtotal?.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-gray-500"><span>Envío</span><span>${order.shipping?.toFixed(2)}</span></div>
              {(order.tax ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-gray-500"><span>IVA</span><span>${order.tax?.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100"><span>Total</span><span>${order.total.toFixed(2)}</span></div>
            </div>
          </div>

          {/* Update status */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Estado del Pedido</h2>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  disabled={saving || status === s.value}
                  onClick={() => handleSaveStatus(s.value)}
                  className={`py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all disabled:cursor-not-allowed ${
                    status === s.value
                      ? `${s.color} border-transparent`
                      : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mb-4">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Notas internas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Notas sobre este pedido..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none resize-none"
              />
            </div>
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="w-full py-3 bg-[#33172c] text-white rounded-xl text-sm font-bold hover:bg-[#4b2c42] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {saving ? "Guardando..." : "Guardar Notas"}
            </button>
          </div>
        </div>

        {/* Customer info */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Cliente</h2>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Nombre</p>
                <p className="text-sm font-semibold text-gray-800">{order.customer}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Correo</p>
                <p className="text-sm text-gray-600">{order.email}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Dirección</p>
                <p className="text-sm text-gray-600">{order.address || <span className="italic text-gray-300">No especificada</span>}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Detalles</h2>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Método de pago</p>
                <p className="text-sm font-semibold text-gray-800">
                  {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Método de envío</p>
                <p className="text-sm font-semibold text-gray-800">{order.shippingMethod}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
