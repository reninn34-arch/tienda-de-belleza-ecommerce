"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Category {
  value: string;
  label: string;
}

interface Branch {
  id: string;
  name: string;
  address?: string | null;
}

interface InventoryEntry {
  branchId: string;
  stock: string; // string para el input, se parsea al enviar
}

interface ProductFormData {
  id: string;
  name: string;
  description: string;
  price: string;
  cost: string;
  sku: string;
  category: string;
  image: string;
  badge: string;
  features: string[];
  gallery: string[];
  swatches: { color: string; label: string }[];
  reviews: { title: string; text: string; author: string; stars: string }[];
  details: string;
  howToUse: string;
  shippingInfo: string;
  highlights: { icon: string; title: string; desc: string }[];
  highlightsLabel: string;
  highlightsTitle: string;
  scienceTitle: string;
  scienceDesc: string;
  scienceItems: { icon: string; title: string; desc: string }[];
  taxRate: string;
}

interface ProductFormProps {
  initial?: Partial<Omit<ProductFormData, 'taxRate'>> & {
    inventories?: { branchId: string; stock: number }[];
    taxRate?: number;
  };
  mode: "new" | "edit";
  productId?: string;
}

const HIGHLIGHT_ICONS = [
  { icon: "schedule", label: "Tiempo" },
  { icon: "science", label: "Ciencia" },
  { icon: "auto_awesome", label: "Brillo" },
  { icon: "eco", label: "Natural" },
  { icon: "spa", label: "Spa" },
  { icon: "flare", label: "Destello" },
  { icon: "star", label: "Estrella" },
  { icon: "favorite", label: "Favorito" },
  { icon: "water_drop", label: "Agua" },
  { icon: "bolt", label: "Energía" },
  { icon: "verified", label: "Verificado" },
  { icon: "shield", label: "Protección" },
  { icon: "recycling", label: "Eco" },
  { icon: "colorize", label: "Color" },
  { icon: "palette", label: "Paleta" },
  { icon: "brush", label: "Pincel" },
  { icon: "face", label: "Rostro" },
  { icon: "health_and_safety", label: "Salud" },
  { icon: "diamond", label: "Premium" },
  { icon: "workspace_premium", label: "Pro" },
  { icon: "local_florist", label: "Floral" },
  { icon: "grass", label: "Vegetal" },
];

export default function ProductForm({ initial, mode, productId }: ProductFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState<number | null>(null);
  const [scienceIconPickerOpen, setScienceIconPickerOpen] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [inventories, setInventories] = useState<InventoryEntry[]>([]);

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []));

    // Cargar sucursales para el panel de inventario
    fetch("/api/admin/branches")
      .then((r) => r.json())
      .then((data: Branch[]) => {
        setBranches(data);
        // Inicializar inventarios: si el producto ya tiene datos, usarlos; si no, crear entradas vacías
        const existingInventories = initial?.inventories ?? [];
        setInventories(
          data.map((branch) => {
            const existing = existingInventories.find((inv) => inv.branchId === branch.id);
            return {
              branchId: branch.id,
              stock: existing ? String(existing.stock) : "0",
            };
          })
        );
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [form, setForm] = useState<ProductFormData>({
    id: initial?.id ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    sku: initial?.sku ?? "",
    cost: initial?.cost !== undefined ? initial.cost.toString() : "",
    price: initial?.price ?? "",
    category: initial?.category ?? "permanent",
    image: initial?.image ?? "",
    badge: initial?.badge ?? "",
    features: initial?.features ?? [""],
    gallery: initial?.gallery ?? [],
    swatches: initial?.swatches ?? [],
    reviews: initial?.reviews ?? [],
    details: initial?.details ?? "",
    howToUse: initial?.howToUse ?? "",
    shippingInfo: initial?.shippingInfo ?? "",
    highlights: initial?.highlights ?? [],
    highlightsLabel: initial?.highlightsLabel ?? "",
    highlightsTitle: initial?.highlightsTitle ?? "",
    scienceTitle: initial?.scienceTitle ?? "",
    scienceDesc: initial?.scienceDesc ?? "",
    scienceItems: initial?.scienceItems ?? [],
    taxRate: initial?.taxRate?.toString() ?? "0",
  });

  function set(key: keyof ProductFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setFeature(i: number, value: string) {
    setForm((prev) => {
      const features = [...prev.features];
      features[i] = value;
      return { ...prev, features };
    });
  }

  function addFeature() {
    setForm((prev) => ({ ...prev, features: [...prev.features, ""] }));
  }

  function removeFeature(i: number) {
    setForm((prev) => ({ ...prev, features: prev.features.filter((_, idx) => idx !== i) }));
  }

  function setGalleryImage(i: number, url: string) {
    setForm((prev) => { const gallery = [...prev.gallery]; gallery[i] = url; return { ...prev, gallery }; });
  }
  function removeGalleryImage(i: number) {
    setForm((prev) => ({ ...prev, gallery: prev.gallery.filter((_, idx) => idx !== i) }));
  }

  function addSwatch() {
    setForm((prev) => ({ ...prev, swatches: [...prev.swatches, { color: "#33172c", label: "" }] }));
  }
  function removeSwatch(i: number) {
    setForm((prev) => ({ ...prev, swatches: prev.swatches.filter((_, idx) => idx !== i) }));
  }
  function setSwatch(i: number, field: "color" | "label", value: string) {
    setForm((prev) => { const swatches = [...prev.swatches]; swatches[i] = { ...swatches[i], [field]: value }; return { ...prev, swatches }; });
  }

  function addReview() {
    setForm((prev) => ({ ...prev, reviews: [...prev.reviews, { title: "", text: "", author: "", stars: "5" }] }));
  }
  function removeReview(i: number) {
    setForm((prev) => ({ ...prev, reviews: prev.reviews.filter((_, idx) => idx !== i) }));
  }
  function setReview(i: number, field: string, value: string) {
    setForm((prev) => { const reviews = [...prev.reviews]; reviews[i] = { ...reviews[i], [field]: value }; return { ...prev, reviews }; });
  }

  function addHighlight() {
    setForm((prev) => ({ ...prev, highlights: [...prev.highlights, { icon: "star", title: "", desc: "" }] }));
  }
  function removeHighlight(i: number) {
    setForm((prev) => ({ ...prev, highlights: prev.highlights.filter((_, idx) => idx !== i) }));
  }
  function setHighlight(i: number, field: "icon" | "title" | "desc", value: string) {
    setForm((prev) => { const highlights = [...prev.highlights]; highlights[i] = { ...highlights[i], [field]: value }; return { ...prev, highlights }; });
  }

  function addScienceItem() {
    setForm((prev) => ({ ...prev, scienceItems: [...prev.scienceItems, { icon: "spa", title: "", desc: "" }] }));
  }
  function removeScienceItem(i: number) {
    setForm((prev) => ({ ...prev, scienceItems: prev.scienceItems.filter((_, idx) => idx !== i) }));
  }
  function setScienceItem(i: number, field: "icon" | "title" | "desc", value: string) {
    setForm((prev) => { const scienceItems = [...prev.scienceItems]; scienceItems[i] = { ...scienceItems[i], [field]: value }; return { ...prev, scienceItems }; });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) set("image", data.url);
    setUploading(false);
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setGalleryUploading(true);
    const urls: string[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) urls.push(data.url);
    }
    setForm((prev) => ({ ...prev, gallery: [...prev.gallery, ...urls] }));
    setGalleryUploading(false);
    if (galleryFileRef.current) galleryFileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const autoId = form.id.trim() || slugify(form.name);
    const body = {
      ...form,
      id: autoId || undefined,
      price: parseFloat(form.price) || 0,
      cost: form.cost ? parseFloat(form.cost) : undefined,
      sku: form.sku || undefined,
      features: form.features.filter(Boolean),
      badge: form.badge || undefined,
      gallery: form.gallery.filter(Boolean),
      swatches: form.swatches.filter((s) => s.label),
      reviews: form.reviews
        .filter((r) => r.author)
        .map((r) => ({ ...r, stars: parseFloat(r.stars) })),
      details: form.details,
      howToUse: form.howToUse,
      shippingInfo: form.shippingInfo,
      highlights: form.highlights.filter((h) => h.title) || undefined,
      highlightsLabel: form.highlightsLabel || undefined,
      highlightsTitle: form.highlightsTitle || undefined,
      scienceTitle: form.scienceTitle || undefined,
      scienceDesc: form.scienceDesc || undefined,
      scienceItems: form.scienceItems.filter((s) => s.title).length ? form.scienceItems.filter((s) => s.title) : undefined,
      taxRate: parseFloat(form.taxRate) || 0,
      // Inventario por sucursal
      inventories: inventories
        .filter((inv) => inv.stock !== "" && !isNaN(parseInt(inv.stock, 10)))
        .map((inv) => ({ branchId: inv.branchId, stock: parseInt(inv.stock, 10) })),
    };
    let res;
    if (mode === "new") {
      res = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      res = await fetch(`/api/admin/products/${productId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    
    setSaving(false);
    
    if (!res.ok) {
      alert("Hubo un error al guardar el producto. Revisa los datos o la conexión.");
      return;
    }

    setToast(mode === "new" ? "Producto creado correctamente." : "Producto actualizado correctamente.");
    setTimeout(() => router.push("/admin/products"), 1000);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 text-gray-800" style={{ fontFamily: "Manrope, sans-serif" }}>
      {/* Barra superior de acciones fijas (Estilo Shopify) */}
      <div className="sticky top-12 z-40 bg-[#f6f7f9] pt-4 pb-4 border-b border-gray-200 mb-6 -mx-4 px-4 sm:-mx-8 sm:px-8 flex flex-col gap-2">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button type="button" onClick={() => router.push("/admin/products")} className="hover:text-gray-900 flex items-center gap-1 transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Productos
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{mode === "new" ? "Nuevo producto" : (form.name || "Editar producto")}</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === "new" ? "Crear producto" : "Editar producto"}
          </h1>
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => router.push("/admin/products")} 
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Descartar
            </button>
            <button 
              onClick={handleSubmit}
              disabled={saving} 
              className="px-4 py-2 text-sm font-semibold text-white bg-[#33172c] rounded-lg hover:bg-[#4b2c42] disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {toast}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* BLOQUE 1: Información General */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-semibold mb-4 text-gray-900">Información del producto</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Título</label>
              <input 
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all outline-none"
                value={form.name} 
                onChange={e => set("name", e.target.value)} 
                placeholder="Ej. Crema Hidratante Facial"
                required 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Descripción</label>
              <textarea 
                rows={4}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all outline-none"
                value={form.description} 
                onChange={e => set("description", e.target.value)}
                placeholder="Describe los beneficios de tu producto..." 
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">SKU <span className="text-gray-400 font-normal">(Opcional)</span></label>
                <input 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 transition-all outline-none"
                  value={form.sku || ''} 
                  onChange={e => set("sku", e.target.value)} 
                  placeholder="Ej. CRM-HID-001"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">ID del Producto <span className="text-gray-400 font-normal">(Opcional)</span></label>
                <input 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 transition-all outline-none font-mono text-sm"
                  value={form.id} 
                  onChange={e => set("id", e.target.value)} 
                  placeholder="crema-hidratante-facial"
                />
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUE 2: Multimedia */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-semibold mb-1 text-gray-900">Elementos multimedia</h2>
          <p className="text-sm text-gray-500 mb-4">Añade imágenes de alta calidad de tu producto.</p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-medium">Imagen Principal</label>
              <div className="flex flex-wrap gap-5 items-start">
                <div className="w-28 h-36 rounded-xl bg-gray-50 overflow-hidden border border-gray-200 flex-shrink-0 flex items-center justify-center">
                  {form.image ? (
                    <Image src={form.image} alt="preview" width={112} height={144} className="w-full h-full object-cover" sizes="112px" />
                  ) : (
                    <span className="material-symbols-outlined text-gray-300 text-3xl">image</span>
                  )}
                </div>
                <div className="flex-1 min-w-[200px] space-y-3">
                  <div>
                    <input
                      value={form.image}
                      onChange={(e) => set("image", e.target.value)}
                      placeholder="URL de la imagen"
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 transition-all outline-none text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">o</span>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {uploading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">upload</span>}
                      {uploading ? "Subiendo..." : "Subir archivo"}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm text-gray-700 mb-2 font-medium">Galería de Imágenes <span className="text-gray-400 font-normal">(Opcional)</span></label>
              {form.gallery.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {form.gallery.map((url, i) => (
                    <div key={i} className="space-y-2">
                      <div className="relative group aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
                        {url && <Image src={url} alt="" fill className="object-cover" sizes="(min-width: 1024px) 25vw, 50vw" />}
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(i)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full hidden group-hover:flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-[13px]">close</span>
                        </button>
                      </div>
                      <input
                        value={url}
                        onChange={(e) => setGalleryImage(i, e.target.value)}
                        placeholder="URL de la imagen"
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-gray-900 outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, gallery: [...prev.gallery, ""] }))}
                  className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Añadir URL
                </button>
                <button
                  type="button"
                  onClick={() => galleryFileRef.current?.click()}
                  disabled={galleryUploading}
                  className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {galleryUploading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">upload</span>}
                  {galleryUploading ? "Subiendo..." : "Subir imágenes"}
                </button>
                <input ref={galleryFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUE 3: Precios */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-semibold mb-4 text-gray-900">Precios</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Precio de Venta ($)</label>
              <input 
                type="number" 
                step="0.01" 
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                value={form.price} 
                onChange={e => set("price", e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Costo por artículo ($)</label>
              <input 
                type="number" 
                step="0.01" 
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                value={form.cost} 
                onChange={e => set("cost", e.target.value)} 
              />
              <p className="text-xs text-gray-400 mt-1">Los clientes no verán esto.</p>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">IVA (%)</label>
              <input 
                type="number" 
                step="0.01" 
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                value={form.taxRate} 
                onChange={e => set("taxRate", e.target.value)} 
              />
            </div>
          </div>
        </div>

        {/* BLOQUE 4: Organización y Disponibilidad */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-semibold mb-4 text-gray-900">Organización y Disponibilidad</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Categoría</label>
                <select 
                  className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-900 outline-none"
                  value={form.category} 
                  onChange={e => set("category", e.target.value)}
                >
                  <option value="">Selecciona una categoría...</option>
                  {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  {categories.length === 0 && <option value={form.category}>{form.category}</option>}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Badge / Etiqueta <span className="text-gray-400 font-normal">(Opcional)</span></label>
                <input 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                  value={form.badge} 
                  onChange={e => set("badge", e.target.value)}
                  placeholder="Ej. Nuevo, Más vendido"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-gray-700">Inventario por Sucursal</label>
                <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-bold">
                  Total: {inventories.reduce((sum, inv) => sum + (parseInt(inv.stock, 10) || 0), 0)}
                </span>
              </div>
              <div className="space-y-2 mt-2">
                {branches.length === 0 ? (
                  <p className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg border border-gray-100">No hay sucursales configuradas.</p>
                ) : (
                  inventories.map((inv, i) => {
                    const branch = branches.find((b) => b.id === inv.branchId);
                    if (!branch) return null;
                    return (
                      <div key={inv.branchId} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-sm font-medium text-gray-700 truncate mr-2">{branch.name}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={inv.stock}
                            onChange={(e) =>
                              setInventories((prev) =>
                                prev.map((item, idx) => idx === i ? { ...item, stock: e.target.value } : item)
                              )
                            }
                            className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm text-right focus:ring-2 focus:ring-gray-900 outline-none"
                            placeholder="0"
                          />
                          <span className="text-xs text-gray-500">uds.</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUE 5: Detalles Adicionales */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-semibold mb-1 text-gray-900">Especificaciones (Tienda Online)</h2>
          <p className="text-sm text-gray-500 mb-4">Información detallada que los clientes verán desplegada en la web.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Detalles e Ingredientes</label>
              <textarea 
                rows={2} 
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                value={form.details}
                onChange={e => set("details", e.target.value)}
                placeholder="Describe los ingredientes, materiales o detalles técnicos del producto..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Modo de Uso</label>
              <textarea 
                rows={2} 
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                value={form.howToUse}
                onChange={e => set("howToUse", e.target.value)}
                placeholder="Instrucciones de uso paso a paso..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Envíos y Devoluciones</label>
              <textarea 
                rows={2} 
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                value={form.shippingInfo}
                onChange={e => set("shippingInfo", e.target.value)}
                placeholder="Información de envío, tiempos y política de devoluciones..."
              />
            </div>
          </div>
        </div>

        {/* BLOQUE 6: Características */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-semibold mb-4 text-gray-900">Características Clave</h2>
          <div className="space-y-2 mb-3">
            {form.features.map((f, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={f}
                  onChange={(e) => setFeature(i, e.target.value)}
                  placeholder={`Característica ${i + 1}`}
                  className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none text-sm"
                />
                {form.features.length > 1 && (
                  <button type="button" onClick={() => removeFeature(i)} className="px-3 text-gray-400 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addFeature} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Añadir característica
          </button>
        </div>

        {/* BLOQUE 7: Ventajas (Highlights) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-semibold mb-1 text-gray-900">Ventajas / Por qué lo Amarás</h2>
          <p className="text-sm text-gray-500 mb-4">Personaliza el título de la sección y agrega hasta 4 ventajas con ícono.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Etiqueta de sección</label>
              <input
                value={form.highlightsLabel}
                onChange={(e) => set("highlightsLabel", e.target.value)}
                placeholder="La Ventaja Alquímica"
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Título de sección</label>
              <input
                value={form.highlightsTitle}
                onChange={(e) => set("highlightsTitle", e.target.value)}
                placeholder="Por qué lo Amarás"
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none text-sm"
              />
            </div>
          </div>
          <div className="space-y-4 mb-4">
            {form.highlights.map((h, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 relative bg-gray-50">
                <button type="button" onClick={() => removeHighlight(i)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500">
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Ícono</label>
                    <button
                      type="button"
                      onClick={() => setIconPickerOpen(iconPickerOpen === i ? null : i)}
                      className="flex items-center gap-2 w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-gray-700">{h.icon || "star"}</span>
                      <span className="text-gray-700 flex-1 text-left">{h.icon || "Elegir ícono"}</span>
                      <span className="material-symbols-outlined text-gray-400 text-[18px]">
                        {iconPickerOpen === i ? "expand_less" : "expand_more"}
                      </span>
                    </button>
                    {iconPickerOpen === i && (
                      <div className="mt-2 bg-white border border-gray-200 rounded-lg p-2 grid grid-cols-5 gap-1 shadow-lg absolute z-10 w-64">
                        {HIGHLIGHT_ICONS.map((ic) => (
                          <button
                            key={ic.icon}
                            type="button"
                            title={ic.label}
                            onClick={() => { setHighlight(i, "icon", ic.icon); setIconPickerOpen(null); }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-md text-[10px] transition-colors ${
                              h.icon === ic.icon ? "bg-[#33172c] text-white" : "hover:bg-gray-100 text-gray-600"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[20px]">{ic.icon}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Título</label>
                    <input
                      value={h.title}
                      onChange={(e) => setHighlight(i, "title", e.target.value)}
                      placeholder="Larga Duración"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Descripción</label>
                  <textarea
                    value={h.desc}
                    onChange={(e) => setHighlight(i, "desc", e.target.value)}
                    rows={2}
                    placeholder="Descripción de la ventaja..."
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addHighlight} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Añadir ventaja
          </button>
        </div>

        {/* BLOQUE 8: Tonos / Swatches */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-semibold mb-4 text-gray-900">Tonos / Swatches</h2>
          <div className="space-y-3 mb-3">
            {form.swatches.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="color"
                  value={s.color}
                  onChange={(e) => setSwatch(i, "color", e.target.value)}
                  className="w-10 h-10 rounded-full border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"
                />
                <input
                  value={s.label}
                  onChange={(e) => setSwatch(i, "label", e.target.value)}
                  placeholder="Nombre del tono"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none"
                />
                <button type="button" onClick={() => removeSwatch(i)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addSwatch} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Añadir tono
          </button>
        </div>

        {/* BLOQUE 9: Reseñas */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-semibold mb-4 text-gray-900">Reseñas</h2>
          <div className="space-y-4 mb-3">
            {form.reviews.map((r, i) => (
              <div key={i} className="border border-gray-200 bg-gray-50 rounded-lg p-4 relative">
                <button type="button" onClick={() => removeReview(i)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500">
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Título</label>
                    <input value={r.title} onChange={(e) => setReview(i, "title", e.target.value)} placeholder='"Magia Pura"' className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Autor</label>
                    <input value={r.author} onChange={(e) => setReview(i, "author", e.target.value)} placeholder="Elena R." className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Texto</label>
                  <textarea value={r.text} onChange={(e) => setReview(i, "text", e.target.value)} rows={2} placeholder="El texto de la reseña..." className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Estrellas (1–5)</label>
                  <input type="number" min="1" max="5" step="0.5" value={r.stars} onChange={(e) => setReview(i, "stars", e.target.value)} className="w-24 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addReview} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Añadir reseña
          </button>
        </div>

        {/* BLOQUE 10: La Ciencia del Tono */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">La Ciencia del Tono</h2>
              <p className="text-sm text-gray-500">Sección informativa sobre ingredientes y tecnología.</p>
            </div>
            <button type="button" onClick={addScienceItem} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Añadir ítem
            </button>
          </div>
          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Título de sección</label>
              <input
                value={form.scienceTitle}
                onChange={(e) => set("scienceTitle", e.target.value)}
                placeholder="La Ciencia del Tono"
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Descripción</label>
              <textarea
                value={form.scienceDesc}
                onChange={(e) => set("scienceDesc", e.target.value)}
                rows={3}
                placeholder="Nuestra exclusiva fórmula combina..."
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none resize-none text-sm"
              />
            </div>
          </div>

          <div className="space-y-4">
            {form.scienceItems.map((s, i) => (
              <div key={i} className="border border-gray-200 bg-gray-50 rounded-lg p-4 relative">
                <button type="button" onClick={() => removeScienceItem(i)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500">
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Ícono</label>
                    <button
                      type="button"
                      onClick={() => setScienceIconPickerOpen(scienceIconPickerOpen === i ? null : i)}
                      className="flex items-center gap-2 w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-gray-700">{s.icon || "spa"}</span>
                      <span className="text-gray-700 flex-1 text-left">{s.icon || "Elegir ícono"}</span>
                      <span className="material-symbols-outlined text-gray-400 text-[18px]">
                        {scienceIconPickerOpen === i ? "expand_less" : "expand_more"}
                      </span>
                    </button>
                    {scienceIconPickerOpen === i && (
                      <div className="mt-2 bg-white border border-gray-200 rounded-lg p-2 grid grid-cols-5 gap-1 shadow-lg absolute z-10 w-64">
                        {HIGHLIGHT_ICONS.map((ic) => (
                          <button
                            key={ic.icon}
                            type="button"
                            title={ic.label}
                            onClick={() => { setScienceItem(i, "icon", ic.icon); setScienceIconPickerOpen(null); }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-md text-[10px] transition-colors ${
                              s.icon === ic.icon ? "bg-[#33172c] text-white" : "hover:bg-gray-100 text-gray-600"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[20px]">{ic.icon}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Título</label>
                    <input
                      value={s.title}
                      onChange={(e) => setScienceItem(i, "title", e.target.value)}
                      placeholder="Argán Prensado en Frío"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none"
                    />
                  </div>
                </div>
                <textarea
                  value={s.desc}
                  onChange={(e) => setScienceItem(i, "desc", e.target.value)}
                  rows={2}
                  placeholder="Procedente de las montañas del Atlas..."
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none resize-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Fin del formulario */}      </form>
    </div>
  );
}
