"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Page {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  createdAt: string;
}

const FIXED_PAGES = [
  {
    label: "Inicio",
    href: "/admin/home",
    storeHref: "/",
    icon: "home",
    desc: "Edita las secciones de la página principal de la tienda.",
  },
  {
    label: "Novedades",
    href: "/admin/novedades",
    storeHref: "/novedades",
    icon: "new_releases",
    desc: "Selecciona y ordena los productos más recientes.",
  },
  {
    label: "Más Vendidos",
    href: "/admin/mas-vendidos",
    storeHref: "/mas-vendidos",
    icon: "trending_up",
    desc: "Selecciona y ordena los productos más populares.",
  },
  {
    label: "Tutoriales",
    href: "/admin/tutorials",
    storeHref: "/tutorials",
    icon: "play_circle",
    desc: "Gestiona videos y preguntas frecuentes.",
  },
];

export default function PagesAdminPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/admin/pages")
      .then((r) => r.json())
      .then((data) => { setPages(data); setLoading(false); });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/pages/${id}`, { method: "DELETE" });
    setPages((prev) => prev.filter((p) => p.id !== id));
    setDeleteId(null);
    showToast("Página eliminada correctamente.");
  }

  async function togglePublished(page: Page) {
    const updated = { ...page, published: !page.published };
    await fetch(`/api/admin/pages/${page.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: updated.published }),
    });
    setPages((prev) => prev.map((p) => (p.id === page.id ? updated : p)));
    showToast(updated.published ? "Página publicada." : "Página despublicada.");
  }

  return (
    <div className="p-4 sm:p-8">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {toast}
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-600 text-2xl">delete</span>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">¿Eliminar página?</h3>
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Páginas</h1>
        <p className="text-sm text-gray-400 mt-1">
          Gestiona todas las páginas de la tienda.
        </p>
      </div>

      {/* Páginas fijas */}
      <div className="mb-8">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Páginas del sitio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FIXED_PAGES.map((fp) => (
            <Link
              key={fp.href}
              href={fp.href}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 hover:border-[#33172c]/30 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#33172c]/8 flex items-center justify-center shrink-0 group-hover:bg-[#33172c]/15 transition-colors">
                <span className="material-symbols-outlined text-[#33172c] text-xl">{fp.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">{fp.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{fp.desc}</p>
                <p className="text-[10px] font-mono text-gray-300 mt-1">{fp.storeHref}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Páginas personalizadas */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Páginas personalizadas</h2>
        <Link
          href="/admin/pages/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#33172c] text-white text-xs font-bold rounded-xl hover:bg-[#4b2c42] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Nueva Página
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-7 h-7 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No hay páginas. Crea la primera con el botón de arriba.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Título</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hidden md:table-cell">URL</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hidden sm:table-cell">Creada</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Estado</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {pages.map((page, i) => (
                <tr key={page.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i === pages.length - 1 ? "border-0" : ""}`}>
                  <td className="px-5 py-4 font-semibold text-gray-900">{page.title}</td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                      /p/{page.slug}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-xs text-gray-400">{page.createdAt}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => togglePublished(page)}
                      className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors ${
                        page.published
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {page.published ? "Publicada" : "Borrador"}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/admin/pages/${page.id}`}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-[#33172c]"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </Link>
                      <button
                        onClick={() => setDeleteId(page.id)}
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
