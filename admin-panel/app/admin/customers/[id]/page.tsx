"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Order {
  id: string;
  date: string;
  total: number;
  status: string;
  branch?: { name: string };
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cedula?: string;
  address?: string;
  city?: string;
  totalSpent: number;
  ordersCount: number;
  createdAt: string;
  orders: Order[];
}

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  processing: "bg-indigo-50 text-indigo-700 border-indigo-100",
  cancelled: "bg-red-50 text-red-700 border-red-100",
  refunded: "bg-purple-50 text-purple-700 border-purple-100",
};

export default function CustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/customers/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`
      }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.name) {
          setCustomer(data);
        } else {
          setCustomer(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setCustomer(null);
        setLoading(false);
      });
  }, [id]);

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[400px]">
       <div className="w-8 h-8 rounded-full border-2 border-[#bc93ad] border-t-transparent animate-spin" />
    </div>
  );

  if (!customer) return (
    <div className="p-8 text-center text-gray-500">Cliente no encontrado.</div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="sticky top-12 z-40 bg-[#f6f7f9] pt-4 pb-4 border-b border-gray-200 mb-8 -mx-4 px-4 sm:-mx-8 sm:px-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/admin/customers" className="hover:text-gray-900 flex items-center gap-1 transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Clientes
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium truncate">{customer.name || 'Cargando...'}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Info (Left) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-2xl mb-4">
                  {customer.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <p className="text-sm text-gray-500">{customer.email}</p>
                {customer.cedula && (
                   <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-2">
                     Cédula: {customer.cedula}
                   </p>
                )}
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-gray-400 text-[20px]">call</span>
                  <p className="text-sm text-gray-700">{customer.phone || 'Sin teléfono'}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-gray-400 text-[20px]">location_on</span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700">{customer.address || 'Sin dirección'}</p>
                    {customer.city && <p className="text-xs text-gray-400">{customer.city}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-gray-400 text-[20px]">calendar_today</span>
                  <p className="text-sm text-gray-700 flex-1">
                    Cliente desde: <span className="font-semibold">{new Date(customer.createdAt).toLocaleDateString()}</span>
                  </p>
                </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 grid grid-cols-2 gap-4">
            <div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lifetime Value</p>
               <p className="text-xl font-bold text-emerald-600">${customer.totalSpent.toFixed(2)}</p>
            </div>
            <div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ticket Promedio</p>
               <p className="text-xl font-bold text-indigo-600">
                 ${customer.ordersCount > 0 ? (customer.totalSpent / customer.ordersCount).toFixed(2) : '0.00'}
               </p>
            </div>
          </div>
        </div>

        {/* Order History (Right) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/20">
               <h3 className="font-bold text-gray-900">Historial de Pedidos</h3>
               <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-gray-500 uppercase">
                 {customer.ordersCount} Pedidos Totales
               </span>
            </div>
            
            <div className="overflow-x-auto">
              {customer.orders.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">Este cliente aún no tiene pedidos.</div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left order-collapse min-w-[800px] whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">ID Pedido</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sucursal / Origen</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Ver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customer.orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4 font-bold text-xs text-[#bc93ad]">{order.id}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px] text-gray-400">
                              {order.branch?.name === 'tienda-online' ? 'public' : 'storefront'}
                            </span>
                            <span className="text-[11px] font-medium text-gray-600 truncate max-w-[120px]">
                              {order.branch?.name === 'tienda-online' ? 'Online' : (order.branch?.name || 'Online')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-sm text-gray-900">${order.total.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${STATUS_STYLE[order.status] || 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link 
                            href={`/admin/orders/${order.id}`}
                            className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all inline-block"
                          >
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
