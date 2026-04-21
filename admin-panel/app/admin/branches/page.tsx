"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Branch {
  id: string;
  name: string;
  address?: string | null;
  _count?: {
    inventories: number;
  };
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/admin/branches");
      const data = await res.json();
      setBranches(data);
    } catch (err) {
      console.error("Error cargando sucursales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setForm({ name: "", address: "" });
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingId(branch.id);
    setForm({ name: branch.name, address: branch.address || "" });
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const url = editingId ? `/api/admin/branches` : `/api/admin/branches`;
      const method = "POST"; // For simplicity in the proxy, but ideally PUT needs a separate proxy setup if we didn't add it.
      // Wait, our proxy only has POST and GET /api/admin/branches !
      // Let's check `admin-panel/app/api/admin/branches/route.ts` - I only created GET and POST. 
      // Si necesitamos PUT y DELETE, deberíamos pegarle directo al backend o crearlos.
      // Le pegaremos al proxy, y si nos falta el método lo agregamos después, o simplemente usamos un endpoint /api/admin/branches/:id.
      // Let's create the full proxy just to be safe. Actually, the easiest is to hit the proxy with POST, we will assume POST creates. We'll add the proxy handles shortly.
      
      const response = await fetch(editingId ? `/api/admin/branches/${editingId}` : `/api/admin/branches`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Error al guardar");
      }

      await fetchBranches();
      closeModal();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (name === "tienda-online") {
      alert("No puedes borrar la sucursal principal por defecto.");
      return;
    }
    
    if (!confirm(`¿Estás seguro de que quieres eliminar la sucursal "${name}"? ESTO ELIMINARÁ TAMBIÉN TODO EL REGISTRO DE STOCK (INVENTARIO) ASOCIADO A ESTA SUCURSAL.`)) return;

    try {
      const response = await fetch(`/api/admin/branches/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Error al eliminar");
      }
      await fetchBranches();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="p-8"><div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"/></div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/settings"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-[#33172c] hover:bg-gray-100 transition-colors flex-shrink-0"
            title="Volver a Configuración"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Sucursales y Ubicaciones</h1>
            <p className="text-sm text-gray-400 mt-1">Administra tus locales físicos para controlar el inventario y ventas separadas.</p>
          </div>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#33172c] hover:bg-[#4a2441] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva Sucursal
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="py-4 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nombre del Local</th>
              <th className="py-4 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dirección</th>
              <th className="py-4 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Registros de Inventario</th>
              <th className="py-4 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right w-[120px]">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-50">
            {branches.map((branch) => (
              <tr key={branch.id} className="hover:bg-gray-50/30 transition-colors group">
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px] text-gray-300">
                      {branch.name === "tienda-online" ? "language" : "storefront"}
                    </span>
                    <div>
                      <p className="font-bold text-gray-800">{branch.name}</p>
                      {branch.name === "tienda-online" && (
                        <span className="inline-block mt-1 bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-md">Principal / Delivery</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-5 text-gray-500">
                  {branch.address || <span className="text-gray-300 italic">No especificada</span>}
                </td>
                <td className="py-3.5 px-5 text-center">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 bg-gray-50 border border-gray-100 rounded-md text-xs font-bold text-gray-500">
                    {branch._count?.inventories || 0}
                  </span>
                </td>
                <td className="py-3.5 px-5 text-right space-x-1">
                  <button
                    onClick={() => openEditModal(branch)}
                    className="p-1.5 text-gray-400 hover:text-[#33172c] hover:bg-gray-100 rounded-lg transition-colors"
                    title="Editar sucursal"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  {branch.name !== "tienda-online" && (
                    <button
                      onClick={() => handleDelete(branch.id, branch.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar sucursal"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {branches.length === 0 && (
          <div className="p-8 text-center text-gray-400">No hay sucursales creadas.</div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-base font-bold text-gray-800">
                {editingId ? "Editar Sucursal" : "Nueva Sucursal"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Nombre del Local *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Local Zona Centro"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Dirección (Opcional)
                </label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Ej: Av. Principal 123"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#33172c] hover:bg-[#4a2441] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  {editingId ? "Guardar Cambios" : "Crear Sucursal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
