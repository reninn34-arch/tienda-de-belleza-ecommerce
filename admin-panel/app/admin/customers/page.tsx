"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cedula?: string;
  city?: string;
  totalSpent: number;
  ordersCount: number;
  lastOrderAt?: string;
  createdAt: string;
  orders?: { branch?: { name: string } }[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  async function fetchCustomers() {
    try {
      const res = await fetch(`/api/admin/customers?q=${search}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecalculate() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/customers/recalculate-all-stats", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`
        }
      });
      if (res.ok) {
        alert("Estadísticas recalculadas (excluyendo cancelaciones).");
        fetchCustomers();
      }
    } catch (error) {
      alert("Error al recalcular.");
    } finally {
      setSyncing(false);
    }
  }

  const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona la base de datos de tus compradores y su valor de vida.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRecalculate}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 border border-indigo-100 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 transition-all disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[20px] ${syncing ? 'animate-spin' : ''}`}>refresh</span>
            {syncing ? 'Recalculando...' : 'Recalcular Estadísticas'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Clientes</p>
          <p className="text-3xl font-bold text-gray-900">{customers.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ventas Totales (LTV)</p>
          <p className="text-3xl font-bold text-emerald-600">${totalSpent.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Promedio por Cliente</p>
          <p className="text-3xl font-bold text-indigo-600">
            ${customers.length > 0 ? (totalSpent / customers.length).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Search & Filters */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/30 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Buscar por nombre, email o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#bc93ad]/20 focus:border-[#bc93ad] outline-none transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pedidos</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Gastado</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Origen / Sucursal</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Último Pedido</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cédula</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Cargando clientes...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{customer.name}</p>
                          <p className="text-xs text-gray-500">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {customer.ordersCount} pedidos
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900">${customer.totalSpent?.toFixed(2) || '0.00'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-gray-400">
                          {customer.orders?.[0]?.branch?.name === 'tienda-online' ? 'public' : 'storefront'}
                        </span>
                        <span className="text-xs text-gray-600">
                          {customer.orders?.[0]?.branch?.name === 'tienda-online' ? 'Online' : (customer.orders?.[0]?.branch?.name || 'Online')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-nowrap">
                      {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">
                      {customer.cedula || '--'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/admin/customers/${customer.id}`}
                        className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-gray-400 hover:text-[#bc93ad]"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
