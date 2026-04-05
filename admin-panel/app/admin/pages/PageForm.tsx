"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MediaInput from "@/components/MediaInput";
import LinkPicker from "@/components/LinkPicker";

interface PageFormProps {
  id?: string;
}

type BlockType = "text" | "banner" | "products";

interface PageBlock {
  id: string;
  type: BlockType;
  // text
  content?: string;
  // banner
  image?: string;
  label?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  // products
  productIds?: string[];
  sectionTitle?: string;
}

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function newBlock(type: BlockType): PageBlock {
  const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  if (type === "text") return { id, type, content: "" };
  if (type === "banner") return { id, type, image: "", label: "", title: "", subtitle: "", ctaText: "", ctaLink: "" };
  return { id, type, sectionTitle: "", productIds: [] };
}

const BLOCK_TYPES: { type: BlockType; icon: string; label: string; desc: string }[] = [
  { type: "text", icon: "notes", label: "Texto", desc: "Párrafos, títulos, listas" },
  { type: "banner", icon: "image", label: "Banner", desc: "Imagen con título y botón" },
  { type: "products", icon: "grid_view", label: "Productos", desc: "Grilla de productos" },
];

export default function PageForm({ id }: PageFormProps) {
  const router = useRouter();
  const isNew = !id;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [published, setPublished] = useState(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [addingBlock, setAddingBlock] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then(setAllProducts)
      .catch(() => {});

    if (!isNew && id) {
      fetch(`/api/admin/pages/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setTitle(data.title ?? "");
          setSlug(data.slug ?? "");
          setBlocks(data.blocks ?? []);
          setPublished(data.published ?? false);
          setSlugManual(true);
          setLoading(false);
        });
    }
  }, [id, isNew]);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    if (!slugManual) setSlug(slugify(e.target.value));
  }

  // ── Block helpers ──
  function updateBlock(idx: number, patch: Partial<PageBlock>) {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  }
  function removeBlock(idx: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
  }
  function moveBlock(idx: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  function toggleProduct(blockIdx: number, productId: string) {
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIdx) return b;
        const ids = b.productIds ?? [];
        return {
          ...b,
          productIds: ids.includes(productId) ? ids.filter((x) => x !== productId) : [...ids, productId],
        };
      })
    );
  }

  async function handleSave() {
    if (!title.trim()) return setError("El título es obligatorio.");
    if (!slug.trim()) return setError("El slug es obligatorio.");
    setSaving(true);
    setError("");
    const url = isNew ? "/api/admin/pages" : `/api/admin/pages/${id}`;
    const method = isNew ? "POST" : "PUT";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug, blocks, published }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al guardar.");
      setSaving(false);
      return;
    }
    router.push("/admin/pages");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="w-7 h-7 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/admin/pages")}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <span className="material-symbols-outlined text-gray-500">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? "Nueva página" : "Editar página"}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Construye la página agregando bloques de contenido.
          </p>
        </div>
      </div>

      {/* Title + Slug + Published */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 mb-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            Título
          </label>
          <input
            value={title}
            onChange={handleTitleChange}
            placeholder="ej. Sobre nosotras"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            Slug (URL)
          </label>
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#33172c] focus-within:ring-2 focus-within:ring-[#33172c]/10 transition">
            <span className="pl-4 pr-1 text-sm text-gray-400 shrink-0">/p/</span>
            <input
              value={slug}
              onChange={(e) => { setSlugManual(true); setSlug(e.target.value); }}
              placeholder="sobre-nosotras"
              className="flex-1 py-3 pr-4 text-sm outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => setPublished((p) => !p)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              published ? "bg-[#33172c]" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                published ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {published
              ? "Publicada — visible en la tienda"
              : "Borrador — no visible en la tienda"}
          </span>
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-4 mb-6">
        {blocks.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
            No hay bloques aún. Agrega uno con el botón de abajo.
          </div>
        )}

        {blocks.map((block, idx) => (
          <div key={block.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Block header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <span className="material-symbols-outlined text-gray-400 text-[18px]">
                {block.type === "text" ? "notes" : block.type === "banner" ? "image" : "grid_view"}
              </span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest flex-1">
                {block.type === "text" ? "Texto" : block.type === "banner" ? "Banner" : "Productos"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveBlock(idx, -1)}
                  disabled={idx === 0}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 disabled:opacity-30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                </button>
                <button
                  onClick={() => moveBlock(idx, 1)}
                  disabled={idx === blocks.length - 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 disabled:opacity-30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                </button>
                <button
                  onClick={() => removeBlock(idx)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors ml-1"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* TEXT block */}
              {block.type === "text" && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                    Contenido (HTML permitido)
                  </label>
                  <textarea
                    value={block.content ?? ""}
                    onChange={(e) => updateBlock(idx, { content: e.target.value })}
                    rows={7}
                    placeholder="<h2>Título</h2>&#10;<p>Párrafo de texto...</p>"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 resize-y transition"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Etiquetas: &lt;h2&gt; &lt;h3&gt; &lt;p&gt; &lt;strong&gt; &lt;em&gt; &lt;ul&gt; &lt;li&gt; &lt;a&gt;
                  </p>
                </div>
              )}

              {/* BANNER block */}
              {block.type === "banner" && (
                <div className="space-y-3">
                  <MediaInput
                    label="Imagen del Banner"
                    value={block.image ?? ""}
                    onChange={(url) => updateBlock(idx, { image: url })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Etiqueta</label>
                      <input value={block.label ?? ""} onChange={(e) => updateBlock(idx, { label: e.target.value })} placeholder="Nueva Colección" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Título</label>
                      <input value={block.title ?? ""} onChange={(e) => updateBlock(idx, { title: e.target.value })} placeholder="El Arte del Color" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Subtítulo</label>
                    <input value={block.subtitle ?? ""} onChange={(e) => updateBlock(idx, { subtitle: e.target.value })} placeholder="Descubre nuestra colección..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Texto del botón</label>
                    <input value={block.ctaText ?? ""} onChange={(e) => updateBlock(idx, { ctaText: e.target.value })} placeholder="Ver productos" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition" />
                  </div>
                  <LinkPicker
                    label="Enlace del botón"
                    value={block.ctaLink ?? ""}
                    onChange={(url) => updateBlock(idx, { ctaLink: url })}
                  />
                </div>
              )}

              {/* PRODUCTS block */}
              {block.type === "products" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                      Título de la sección
                    </label>
                    <input
                      value={block.sectionTitle ?? ""}
                      onChange={(e) => updateBlock(idx, { sectionTitle: e.target.value })}
                      placeholder="Productos destacados"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Seleccionar productos ({(block.productIds ?? []).length} seleccionado(s))
                    </label>
                    <div className="border border-gray-200 rounded-xl divide-y divide-gray-50 max-h-64 overflow-y-auto">
                      {allProducts.map((p) => {
                        const selected = (block.productIds ?? []).includes(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => toggleProduct(idx, p.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                              selected ? "bg-[#33172c]/5" : ""
                            }`}
                          >
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-10 h-12 object-cover rounded-lg shrink-0"
                            />
                            <span className="flex-1 text-sm font-medium text-gray-900">{p.name}</span>
                            <span
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                selected ? "bg-[#33172c] border-[#33172c]" : "border-gray-300"
                              }`}
                            >
                              {selected && (
                                <span className="material-symbols-outlined text-white text-[12px]">check</span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                      {allProducts.length === 0 && (
                        <p className="text-center text-sm text-gray-400 py-6">No hay productos disponibles.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add block */}
      {addingBlock ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Elige un tipo de bloque
            </p>
            <button
              onClick={() => setAddingBlock(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-gray-400 text-[18px]">close</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                onClick={() => {
                  setBlocks((prev) => [...prev, newBlock(bt.type)]);
                  setAddingBlock(false);
                }}
                className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-[#33172c]/40 hover:bg-[#33172c]/5 transition-colors text-center"
              >
                <span className="material-symbols-outlined text-[#33172c] text-2xl">{bt.icon}</span>
                <span className="text-sm font-bold text-gray-900">{bt.label}</span>
                <span className="text-[10px] text-gray-400">{bt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingBlock(true)}
          className="w-full py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-bold text-gray-400 hover:border-[#33172c]/40 hover:text-[#33172c] transition-colors flex items-center justify-center gap-2 mb-6"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Agregar bloque
        </button>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl mb-4">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/pages")}
          className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#33172c] text-white text-sm font-bold rounded-xl hover:bg-[#4b2c42] transition-colors disabled:opacity-50"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[18px]">save</span>
          )}
          {saving ? "Guardando..." : "Guardar página"}
        </button>
      </div>
    </div>
  );
}
