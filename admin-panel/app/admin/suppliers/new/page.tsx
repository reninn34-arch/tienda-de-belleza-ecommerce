"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    taxId: "",
    email: "",
    phone: "",
    contactName: "",
    address: "",
    notes: ""
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        router.push("/admin/suppliers");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.message || "Error al crear proveedor");
      }
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      {/* Breadcrumbs */}
      <div className="mb-6 flex items-center gap-2 text-xs text-gray-400">
        <Link href="/admin/suppliers" className="hover:text-gray-600 transition-colors">Proveedores</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-gray-600 font-semibold">Nuevo Proveedor</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Añadir Proveedor</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nombre de la Empresa / Distribuidor</label>
              <input 
                required
                type="text" 
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Ej: Distribuidora Belleza S.A."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">RUC / Identificación Fiscal</label>
              <input 
                type="text" 
                value={form.taxId}
                onChange={e => setForm({...form, taxId: e.target.value})}
                placeholder="179XXXXXXXXXX"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nombre de Contacto</label>
              <input 
                type="text" 
                value={form.contactName}
                onChange={e => setForm({...form, contactName: e.target.value})}
                placeholder="Ej: Juan Pérez"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Email de Pedidos</label>
              <input 
                type="email" 
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                placeholder="proveedor@email.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Teléfono / WhatsApp</label>
              <input 
                type="text" 
                value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="+593 9..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Dirección Física</label>
              <input 
                type="text" 
                value={form.address}
                onChange={e => setForm({...form, address: e.target.value})}
                placeholder="Calle, Ciudad, Provincia..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Notas Especiales</label>
              <textarea 
                rows={3}
                value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})}
                placeholder="Tiempos de entrega, condiciones de crédito, etc..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
            <Link 
              href="/admin/suppliers"
              className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-all underline underline-offset-4"
            >
              Cancelar
            </Link>
            <button 
              disabled={loading}
              type="submit"
              className="px-8 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Proveedor'}
            </button>
        </div>
      </form>
    </div>
  );
}
