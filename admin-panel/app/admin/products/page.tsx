"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  badge?: string;
  isBundle?: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
  permanent: "Permanente",
  "semi-permanent": "Semi-Permanente",
  "demi-permanent": "Demi-Permanente",
  treatments: "Tratamientos",
  lightener: "Aclarante",
  tools: "Herramientas",
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((data) => { setProducts(data); setLoading(false); });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setDeleteId(null);
    showToast("Producto eliminado correctamente.");
  }

  const filtered = products.filter((p) => {
    if (p.isBundle) return false;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || p.category === category;
    return matchSearch && matchCat;
  });

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

  return (
    <div className="p-4 sm:p-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {toast}
        </div>
      )}

      {/* Delete modal */}
      {deleteId && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-600 text-2xl">delete</span>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">¿Eliminar producto?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-400 mt-1">{products.length} productos en el catálogo</p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#33172c] text-white text-sm font-bold rounded-xl hover:bg-[#4b2c42] transition-colors self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo Producto
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[18px]">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c === "all" ? "Todas las categorías" : (CATEGORY_LABEL[c] ?? c)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-7 h-7 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {search || category !== "all" ? "Sin resultados para esta búsqueda." : "No hay productos. Crea el primero."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Producto</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hidden md:table-cell">Categoría</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Precio</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hidden sm:table-cell">Badge</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, i) => (
                <tr key={product.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i === filtered.length - 1 ? "border-0" : ""}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={44}
                          height={56}
                          className="w-full h-full object-cover"
                          sizes="44px"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-xs px-2.5 py-1 bg-violet-50 text-violet-700 rounded-full font-medium">
                      {CATEGORY_LABEL[product.category] ?? product.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold text-gray-900">${product.price.toFixed(2)}</td>
                  <td className="px-5 py-4 hidden sm:table-cell text-xs text-gray-400">{product.badge ?? "—"}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-[#33172c]"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </Link>
                      <button
                        onClick={() => setDeleteId(product.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
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
