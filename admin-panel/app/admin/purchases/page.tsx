"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Purchase {
  id: string;
  internalId: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  receivedAt?: string;
  supplier: { name: string };
  branch: { name: string };
  _count: { items: number };
}

const STATUS_STYLE: Record<string, string> = {
  RECEIVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
  DRAFT: "bg-gray-50 text-gray-700 border-gray-100",
  CANCELLED: "bg-red-50 text-red-700 border-red-100",
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, []);

  async function fetchPurchases() {
    try {
      const res = await fetch(`/api/admin/purchases`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPurchases(data);
      }
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    if (!confirm(`¿Estás seguro de marcar esta compra como ${status}?${status === 'RECEIVED' ? ' El stock se incrementará automáticamente.' : ''}`)) return;

    try {
      const res = await fetch(`/api/admin/purchases/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        fetchPurchases();
      } else {
        const err = await res.json();
        alert(err.message || "Error al actualizar estado");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compras y Abastecimiento</h1>
          <p className="text-sm text-gray-500 mt-1">Controla las entradas de stock y facturas de proveedores.</p>
        </div>
        <Link 
          href="/admin/purchases/new"
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
        >
          <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
          Registrar Compra
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">ID Orden</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Proveedor</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Destino</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Cargando historial...</td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">No hay registros de compras.</td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-indigo-600">{p.internalId}</p>
                      <p className="text-[10px] text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{p.supplier.name}</p>
                      <p className="text-xs text-gray-500">{p._count.items} productos</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] text-gray-400">storefront</span>
                        <span className="text-xs text-gray-600">{p.branch.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-sm font-bold text-gray-900">${p.totalAmount.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${STATUS_STYLE[p.status] || 'bg-gray-100'}`}>
                         {p.status === 'RECEIVED' ? 'Recibido' : p.status === 'PENDING' ? 'Pendiente' : p.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       {p.status === 'PENDING' && (
                         <button 
                           onClick={() => updateStatus(p.id, 'RECEIVED')}
                           className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all"
                         >
                           <span className="material-symbols-outlined text-[16px]">check_circle</span>
                           Recibir
                         </button>
                       )}
                       {p.status === 'RECEIVED' && (
                         <span className="text-[10px] text-emerald-500 font-bold flex items-center justify-end gap-1">
                           <span className="material-symbols-outlined text-[14px]">task_alt</span>
                           Stock cargado
                         </span>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
