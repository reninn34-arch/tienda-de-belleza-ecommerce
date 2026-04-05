"use client";

import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  image: string;
  category: string;
  price: number;
}

interface CuratedHero {
  label: string;
  title: string;
  subtitle: string;
}

interface Props {
  settingsKey: "novedades" | "bestSellers";
  pageTitle: string;
  storeHref: string;
}

export default function CuratedPageEditor({ settingsKey, pageTitle, storeHref }: Props) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hero, setHero] = useState<CuratedHero>({ label: "", title: "", subtitle: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/products").then((r) => r.json()),
      fetch("/api/admin/settings").then((r) => r.json()),
    ]).then(([products, settings]) => {
      setAllProducts(products);
      const page = settings?.content?.[settingsKey];
      setSelectedIds(page?.productIds ?? []);
      setHero(page?.hero ?? { label: "", title: "", subtitle: "" });
      setLoading(false);
    });
  }, [settingsKey]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function toggleProduct(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...selectedIds];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setSelectedIds(next);
  }

  function moveDown(index: number) {
    if (index === selectedIds.length - 1) return;
    const next = [...selectedIds];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setSelectedIds(next);
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { [settingsKey]: { hero, productIds: selectedIds } } }),
    });
    setSaving(false);
    showToast("Guardado correctamente.");
  }

  const selectedProducts = selectedIds
    .map((id) => allProducts.find((p) => p.id === id))
    .filter(Boolean) as Product[];

  const unselected = allProducts.filter((p) => !selectedIds.includes(p.id));

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center py-20">
        <span className="w-7 h-7 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="text-sm text-gray-400 mt-1">
            Selecciona y ordena los productos que aparecerán en{" "}
            <a href={storeHref} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#33172c]">
              {storeHref}
            </a>
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#33172c] text-white text-sm font-bold rounded-xl hover:bg-[#4b2c42] transition-colors disabled:opacity-60"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[18px]">save</span>
          )}
          Guardar
        </button>
      </div>

      {/* Hero text */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Textos de la página</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Etiqueta</label>
            <input
              value={hero.label}
              onChange={(e) => setHero({ ...hero, label: e.target.value })}
              placeholder="Nuevas Llegadas"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Título</label>
            <input
              value={hero.title}
              onChange={(e) => setHero({ ...hero, title: e.target.value })}
              placeholder="Novedades"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Subtítulo</label>
            <input
              value={hero.subtitle}
              onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
              placeholder="Los últimos lanzamientos"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seleccionados */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Seleccionados ({selectedProducts.length})
            </h2>
            <span className="text-[10px] text-gray-400">El orden define cómo se muestran</span>
          </div>
          {selectedProducts.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">
              Agrega productos desde la lista de la derecha
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {selectedProducts.map((product, i) => (
                <li key={product.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      className="text-gray-300 hover:text-[#33172c] disabled:opacity-20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_drop_up</span>
                    </button>
                    <button
                      onClick={() => moveDown(i)}
                      disabled={i === selectedProducts.length - 1}
                      className="text-gray-300 hover:text-[#33172c] disabled:opacity-20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
                    </button>
                  </div>
                  <div className="w-10 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-400">${product.price.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => toggleProduct(product.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                  >
                    <span className="material-symbols-outlined text-[18px]">remove_circle</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Disponibles */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Disponibles ({unselected.length})
            </h2>
          </div>
          {unselected.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">Todos los productos están seleccionados</p>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {unselected.map((product) => (
                <li key={product.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-400">${product.price.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => toggleProduct(product.id)}
                    className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors text-gray-400 hover:text-emerald-600"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
