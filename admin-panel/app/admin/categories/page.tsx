"use client";

import { useEffect, useState } from "react";

interface Category {
  value: string;
  label: string;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categories ?? []);
        setLoading(false);
      });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function save(updated: Category[]) {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: updated }),
    });
    setSaving(false);
    showToast("Categorías guardadas correctamente.");
  }

  function handleAdd() {
    const label = newLabel.trim();
    if (!label) return;
    const value = newValue.trim() || slugify(label);
    if (categories.some((c) => c.value === value)) {
      showToast("Ya existe una categoría con ese identificador.");
      return;
    }
    const updated = [...categories, { value, label }];
    setCategories(updated);
    save(updated);
    setNewLabel("");
    setNewValue("");
  }

  function handleDelete(index: number) {
    const updated = categories.filter((_, i) => i !== index);
    setCategories(updated);
    save(updated);
    setDeleteIndex(null);
  }

  function handleLabelChange(index: number, label: string) {
    const updated = categories.map((c, i) => (i === index ? { ...c, label } : c));
    setCategories(updated);
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {toast}
        </div>
      )}

      {/* Modal confirmar borrado */}
      {deleteIndex !== null && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-600 text-2xl">delete</span>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">¿Eliminar categoría?</h3>
            <p className="text-sm text-gray-500 text-center mb-1">
              <strong>"{categories[deleteIndex]?.label}"</strong>
            </p>
            <p className="text-xs text-gray-400 text-center mb-6">
              Los productos con esta categoría no se borrarán, pero quedarán sin categoría reconocida en los filtros.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteIndex(null)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteIndex)}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gestiona las categorías disponibles para los productos.
          </p>
        </div>
        {saving && (
          <span className="w-5 h-5 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Agregar nueva */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
          Nueva Categoría
        </h2>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-40">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              Nombre visible *
            </label>
            <input
              value={newLabel}
              onChange={(e) => {
                setNewLabel(e.target.value);
                setNewValue(slugify(e.target.value));
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="ej: Permanente"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
            />
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              Identificador (slug)
            </label>
            <input
              value={newValue}
              onChange={(e) => setNewValue(slugify(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="ej: permanent"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAdd}
              disabled={!newLabel.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#33172c] text-white text-sm font-bold rounded-xl hover:bg-[#4b2c42] transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Agregar
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-7 h-7 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No hay categorías. Crea la primera arriba.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Nombre visible
                </th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Identificador
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => (
                <tr
                  key={cat.value}
                  className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                    i === categories.length - 1 ? "border-0" : ""
                  }`}
                >
                  <td className="px-5 py-3">
                    <input
                      value={cat.label}
                      onChange={(e) => handleLabelChange(i, e.target.value)}
                      onBlur={() => save(categories)}
                      className="w-full border border-transparent hover:border-gray-200 focus:border-[#33172c] rounded-lg px-2 py-1.5 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#33172c]/10 transition-colors"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                      {cat.value}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setDeleteIndex(i)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        El nombre visible se puede editar haciendo clic sobre él. El identificador es permanente y se usa
        internamente en los productos.
      </p>
    </div>
  );
}
