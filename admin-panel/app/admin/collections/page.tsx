"use client";

import { useEffect, useRef, useState } from "react";

interface Collection {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  productIds: string[];
}

interface CollectionsPage {
  hero: { image: string; label: string; title: string };
  intro: { heading: string; body: string };
  collections: Collection[];
  ctaBanner: { label: string; title: string; body: string; buttonText: string; buttonLink: string };
}

interface Product {
  id: string;
  name: string;
  image: string;
}

function emptyCollection(): Collection {
  return {
    id: `col-${Date.now()}`,
    title: "",
    subtitle: "",
    description: "",
    image: "",
    productIds: [],
  };
}

const INPUT =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none";
const LABEL = "block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5";

export default function AdminCollectionsPage() {
  const [page, setPage] = useState<CollectionsPage | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const heroRef = useRef<HTMLInputElement | null>(null);
  const colRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((s) => {
        const raw: CollectionsPage = s.content?.collectionsPage ?? {
          hero: { image: "", label: "", title: "Colecciones" },
          intro: { heading: "", body: "" },
          collections: [],
          ctaBanner: { label: "", title: "", body: "", buttonText: "", buttonLink: "/products" },
        };
        // migrate legacy "featured" field to "productIds"
        const cp: CollectionsPage = {
          ...raw,
          collections: raw.collections.map((c) => ({
            ...c,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            productIds: c.productIds ?? (c as any).featured ?? [],
          })),
        };
        setPage(cp);
      });
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((p: Product[]) => setProducts(p));
  }, []);

  /* ── helpers ─────────────────────────────────────────────── */
  function setHero(key: keyof CollectionsPage["hero"], val: string) {
    setPage((p) => p ? { ...p, hero: { ...p.hero, [key]: val } } : p);
  }
  function setIntro(key: keyof CollectionsPage["intro"], val: string) {
    setPage((p) => p ? { ...p, intro: { ...p.intro, [key]: val } } : p);
  }
  function setBanner(key: keyof CollectionsPage["ctaBanner"], val: string) {
    setPage((p) => p ? { ...p, ctaBanner: { ...p.ctaBanner, [key]: val } } : p);
  }
  function updateCol(idx: number, key: keyof Collection, val: string | string[]) {
    setPage((p) => {
      if (!p) return p;
      const cols = [...p.collections];
      cols[idx] = { ...cols[idx], [key]: val };
      return { ...p, collections: cols };
    });
  }
  function toggleFeatured(idx: number, productId: string) {
    setPage((p) => {
      if (!p) return p;
      const cols = [...p.collections];
      const current = cols[idx].productIds ?? [];
      const productIds = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      cols[idx] = { ...cols[idx], productIds };
      return { ...p, collections: cols };
    });
  }
  function addCollection() {
    setPage((p) => p ? { ...p, collections: [...p.collections, emptyCollection()] } : p);
  }
  function removeCollection(idx: number) {
    setPage((p) => p ? { ...p, collections: p.collections.filter((_, i) => i !== idx) } : p);
  }
  function moveCollection(idx: number, dir: -1 | 1) {
    setPage((p) => {
      if (!p) return p;
      const cols = [...p.collections];
      const t = idx + dir;
      if (t < 0 || t >= cols.length) return p;
      [cols[idx], cols[t]] = [cols[t], cols[idx]];
      return { ...p, collections: cols };
    });
  }

  async function upload(key: string, file: File, onUrl: (url: string) => void) {
    setUploadingKey(key);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await res.json();
    if (data.url) onUrl(data.url);
    setUploadingKey(null);
  }

  async function handleSave() {
    if (!page) return;
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { collectionsPage: page } }),
    });
    setSaving(false);
    setToast("Colecciones guardadas correctamente.");
    setTimeout(() => setToast(""), 3000);
  }

  if (!page) {
    return (
      <div className="p-8 flex justify-center">
        <span className="w-7 h-7 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {toast}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Página de Colecciones</h1>
        <p className="text-sm text-gray-400 mt-1">Controla el banner, las colecciones y los productos destacados.</p>
      </div>

      <div className="space-y-6">

        {/* ── Hero Banner ── */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Banner Hero</h2>

          {/* Image */}
          <div>
            <label className={LABEL}>Imagen de Fondo</label>
            <div className="flex gap-2">
              <input
                value={page.hero.image}
                onChange={(e) => setHero("image", e.target.value)}
                placeholder="https://..."
                className={`flex-1 ${INPUT}`}
              />
              <input
                type="file"
                accept="image/*"
                ref={heroRef}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload("hero", f, (url) => setHero("image", url));
                }}
              />
              <button
                onClick={() => heroRef.current?.click()}
                disabled={uploadingKey === "hero"}
                className="px-3 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-50 flex items-center"
              >
                {uploadingKey === "hero" ? (
                  <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                )}
              </button>
            </div>
            {page.hero.image && (
              <img src={page.hero.image} alt="hero preview" className="mt-2 h-32 w-full object-cover rounded-xl" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Etiqueta (texto pequeño)</label>
              <input value={page.hero.label} onChange={(e) => setHero("label", e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Título Principal</label>
              <input value={page.hero.title} onChange={(e) => setHero("title", e.target.value)} className={INPUT} />
            </div>
          </div>
        </div>

        {/* ── Intro Text ── */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Texto Introductorio</h2>
          <div>
            <label className={LABEL}>Titular (texto grande)</label>
            <textarea
              value={page.intro.heading}
              onChange={(e) => setIntro("heading", e.target.value)}
              rows={2}
              className={`${INPUT} resize-none`}
            />
          </div>
          <div>
            <label className={LABEL}>Cuerpo (texto pequeño derecha)</label>
            <textarea
              value={page.intro.body}
              onChange={(e) => setIntro("body", e.target.value)}
              rows={2}
              className={`${INPUT} resize-none`}
            />
          </div>
        </div>

        {/* ── Collections ── */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Colecciones</h2>
              <p className="text-[11px] text-gray-400 mt-1">Cada colección alterna imagen izquierda/derecha en la tienda.</p>
            </div>
            <button
              onClick={addCollection}
              className="flex items-center gap-1.5 text-xs font-bold text-[#33172c] border border-[#33172c]/30 rounded-xl px-4 py-2 hover:bg-[#33172c]/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Nueva Colección
            </button>
          </div>

          {page.collections.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              No hay colecciones. Haz clic en &ldquo;Nueva Colección&rdquo; para crear una.
            </p>
          )}

          <div className="space-y-6">
            {page.collections.map((col, idx) => (
              <div key={col.id} className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Colección {idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveCollection(idx, -1)}
                      disabled={idx === 0}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30"
                    >
                      <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                    </button>
                    <button
                      onClick={() => moveCollection(idx, 1)}
                      disabled={idx === page.collections.length - 1}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30"
                    >
                      <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                    </button>
                    <button
                      onClick={() => removeCollection(idx)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 text-red-400 hover:bg-red-50"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Image */}
                <div>
                  <label className={LABEL}>Imagen</label>
                  <div className="flex gap-2">
                    <input
                      value={col.image}
                      onChange={(e) => updateCol(idx, "image", e.target.value)}
                      placeholder="https://..."
                      className={`flex-1 ${INPUT}`}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => { colRefs.current[idx] = el; }}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) upload(`col-${idx}`, f, (url) => updateCol(idx, "image", url));
                      }}
                    />
                    <button
                      onClick={() => colRefs.current[idx]?.click()}
                      disabled={uploadingKey === `col-${idx}`}
                      className="px-3 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-50 flex items-center"
                    >
                      {uploadingKey === `col-${idx}` ? (
                        <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">upload</span>
                      )}
                    </button>
                  </div>
                  {col.image && (
                    <img src={col.image} alt="preview" className="mt-2 h-24 w-full object-cover rounded-xl" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Título</label>
                    <input value={col.title} onChange={(e) => updateCol(idx, "title", e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Subtítulo / Temporada</label>
                    <input value={col.subtitle} onChange={(e) => updateCol(idx, "subtitle", e.target.value)} className={INPUT} />
                  </div>
                </div>

                <div>
                  <label className={LABEL}>Descripción</label>
                  <textarea
                    value={col.description}
                    onChange={(e) => updateCol(idx, "description", e.target.value)}
                    rows={2}
                    className={`${INPUT} resize-none`}
                  />
                </div>

                {/* Productos de la colección */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={LABEL}>Productos de esta Colección</label>
                    <span className="text-[10px] text-gray-400">{(col.productIds ?? []).length} seleccionados</span>
                  </div>
                  {products.length === 0 ? (
                    <p className="text-xs text-gray-400">Cargando productos...</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mt-1 max-h-52 overflow-y-auto pr-1">
                      {products.map((p) => {
                        const checked = (col.productIds ?? []).includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleFeatured(idx, p.id)}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-colors text-left w-full ${
                              checked
                                ? "border-[#33172c]/40 bg-[#33172c]/5"
                                : "border-gray-100 hover:border-gray-200"
                            }`}
                          >
                            <img src={p.image} alt={p.name} className="w-8 h-8 object-cover rounded-lg flex-shrink-0" />
                            <span className="text-[11px] font-medium text-gray-700 line-clamp-2 leading-tight flex-1">{p.name}</span>
                            {checked && (
                              <span className="ml-auto text-[#33172c] flex-shrink-0">
                                <span className="material-symbols-outlined text-[14px]">check</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA Banner ── */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Banner Final (CTA)</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Etiqueta</label>
              <input value={page.ctaBanner.label} onChange={(e) => setBanner("label", e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Título</label>
              <input value={page.ctaBanner.title} onChange={(e) => setBanner("title", e.target.value)} className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Descripción</label>
            <textarea
              value={page.ctaBanner.body}
              onChange={(e) => setBanner("body", e.target.value)}
              rows={2}
              className={`${INPUT} resize-none`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Texto del Botón</label>
              <input value={page.ctaBanner.buttonText} onChange={(e) => setBanner("buttonText", e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Enlace del Botón</label>
              <input value={page.ctaBanner.buttonLink} onChange={(e) => setBanner("buttonLink", e.target.value)} className={INPUT} />
            </div>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-[#33172c] text-white rounded-xl text-sm font-bold hover:bg-[#4b2c42] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          {saving ? "Guardando..." : "Guardar Colecciones"}
        </button>
      </div>
    </div>
  );
}
