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
    <div className="p-4 sm:p-8 max-w-3xl">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {toast}
        </div>
      )}

      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <span className="material-symbols-outlined text-gray-400">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{mode === "new" ? "Nuevo Producto" : "Editar Producto"}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{mode === "new" ? "Agrega un producto al catálogo" : form.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Imagen del Producto</h2>
          <div className="flex gap-5 items-start">
            <div className="w-28 h-36 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0 flex items-center justify-center">
              {form.image ? (
                <Image
                  src={form.image}
                  alt="preview"
                  width={112}
                  height={144}
                  className="w-full h-full object-cover"
                  sizes="112px"
                />
              ) : (
                <span className="material-symbols-outlined text-gray-300 text-3xl">image</span>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">URL de la imagen</label>
                <input
                  value={form.image}
                  onChange={(e) => set("image", e.target.value)}
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                />
              </div>
              <p className="text-xs text-gray-400">— o —</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                )}
                {uploading ? "Subiendo..." : "Subir imagen"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Detalles</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Nombre *</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Midnight Plum Serum" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
            </div>
            
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">SKU <span className="font-normal lowercase text-gray-300">(opcional)</span></label>
              <input value={form.sku || ''} onChange={(e) => set("sku", e.target.value)} placeholder="MP-SERUM-001" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Costo (USD) <span className="font-normal lowercase text-gray-300">(opcional)</span></label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input value={form.cost || ''} onChange={(e) => set("cost", e.target.value)} type="number" step="0.01" min="0" placeholder="18.00" className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Precio (USD) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input value={form.price} onChange={(e) => set("price", e.target.value)} required type="number" step="0.01" min="0" placeholder="42.00" className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Tarifa de IVA (%) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.taxRate}
                onChange={(e) => set("taxRate", e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Categoría *</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none">
                {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                {categories.length === 0 && <option value={form.category}>{form.category}</option>}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Descripción *</label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} required rows={3} placeholder="Descripción del producto..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none resize-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Badge <span className="text-gray-300">(opcional)</span></label>
              <input value={form.badge} onChange={(e) => set("badge", e.target.value)} placeholder="Top Rated" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">ID del producto</label>
              <input value={form.id} onChange={(e) => set("id", e.target.value)} placeholder="midnight-plum-serum" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none font-mono text-xs" />
            </div>
          </div>
        </div>

        {/* Inventory per branch */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Inventario por Sucursal</h2>
              <p className="text-[11px] text-gray-400 mt-1">Asigna el stock disponible en cada sucursal. El stock total se calcula automáticamente.</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">
              <span className="material-symbols-outlined text-[14px]">calculate</span>
              Total:{" "}
              <span className="font-bold text-gray-700">
                {inventories.reduce((sum, inv) => sum + (parseInt(inv.stock, 10) || 0), 0)}
              </span>
            </div>
          </div>

          {branches.length === 0 ? (
            <div className="mt-4 border border-dashed border-gray-200 rounded-xl p-6 text-center">
              <span className="material-symbols-outlined text-gray-300 text-3xl block mb-2">store</span>
              <p className="text-sm text-gray-400">No hay sucursales configuradas aún.</p>
              <p className="text-xs text-gray-300 mt-1">Crea sucursales desde el panel de administración para asignar stock.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {inventories.map((inv, i) => {
                const branch = branches.find((b) => b.id === inv.branchId);
                if (!branch) return null;
                const stockNum = parseInt(inv.stock, 10) || 0;
                const stockColor =
                  stockNum === 0
                    ? "text-red-500"
                    : stockNum <= 5
                    ? "text-amber-500"
                    : "text-emerald-600";
                return (
                  <div key={inv.branchId} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="material-symbols-outlined text-[18px] text-[#33172c] flex-shrink-0">
                        {branch.name === "tienda-online" ? "language" : "store"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{branch.name}</p>
                        {branch.address && (
                          <p className="text-[11px] text-gray-400 truncate">{branch.address}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-medium ${stockColor}`}>
                        {stockNum === 0 ? "Sin stock" : stockNum <= 5 ? "Bajo" : "OK"}
                      </span>
                      <input
                        id={`inventory-${inv.branchId}`}
                        type="number"
                        min="0"
                        value={inv.stock}
                        onChange={(e) =>
                          setInventories((prev) =>
                            prev.map((item, idx) =>
                              idx === i ? { ...item, stock: e.target.value } : item
                            )
                          )
                        }
                        className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right font-mono font-medium focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                      />
                      <span className="text-xs text-gray-400">uds.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Características</h2>
          <div className="space-y-2 mb-3">
            {form.features.map((f, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={f}
                  onChange={(e) => setFeature(i, e.target.value)}
                  placeholder={`Característica ${i + 1}`}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                />
                {form.features.length > 1 && (
                  <button type="button" onClick={() => removeFeature(i)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addFeature} className="flex items-center gap-1.5 text-sm text-[#33172c] hover:text-[#4b2c42] font-medium">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Agregar característica
          </button>
        </div>

        {/* Highlights */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ventajas / Por qué lo Amarás</h2>
          <p className="text-[11px] text-gray-400 mb-4">Personaliza el título de la sección y agrega hasta 4 ventajas con ícono.</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Etiqueta de sección</label>
              <input
                value={form.highlightsLabel}
                onChange={(e) => set("highlightsLabel", e.target.value)}
                placeholder="La Ventaja Alquímica"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Título de sección</label>
              <input
                value={form.highlightsTitle}
                onChange={(e) => set("highlightsTitle", e.target.value)}
                placeholder="Por qué lo Amarás"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
              />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mb-4">Se muestran como cards con ícono en la página del producto. Usa nombres de Material Symbols (ej: <span className="font-mono">schedule</span>, <span className="font-mono">eco</span>, <span className="font-mono">science</span>).</p>
          <div className="space-y-4 mb-3">
            {form.highlights.map((h, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3 relative">
                <button type="button" onClick={() => removeHighlight(i)} className="absolute top-3 right-3 p-1 text-gray-300 hover:text-red-500 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
                <div className="grid grid-cols-2 gap-3 pr-8">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Ícono</label>
                    <button
                      type="button"
                      onClick={() => setIconPickerOpen(iconPickerOpen === i ? null : i)}
                      className="flex items-center gap-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#33172c]">{h.icon || "star"}</span>
                      <span className="text-gray-600 flex-1 text-left">{h.icon || "Elegir ícono"}</span>
                      <span className="material-symbols-outlined text-gray-400 text-[16px]">
                        {iconPickerOpen === i ? "expand_less" : "expand_more"}
                      </span>
                    </button>
                    {iconPickerOpen === i && (
                      <div className="mt-2 border border-gray-200 rounded-xl p-3 grid grid-cols-5 gap-2 bg-gray-50">
                        {HIGHLIGHT_ICONS.map((ic) => (
                          <button
                            key={ic.icon}
                            type="button"
                            title={ic.label}
                            onClick={() => { setHighlight(i, "icon", ic.icon); setIconPickerOpen(null); }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] transition-colors ${
                              h.icon === ic.icon
                                ? "bg-[#33172c] text-white"
                                : "hover:bg-white text-gray-500"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[20px]">{ic.icon}</span>
                            {ic.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Título</label>
                    <input
                      value={h.title}
                      onChange={(e) => setHighlight(i, "title", e.target.value)}
                      placeholder="Larga Duración"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#33172c]/20 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Descripción</label>
                  <textarea
                    value={h.desc}
                    onChange={(e) => setHighlight(i, "desc", e.target.value)}
                    rows={2}
                    placeholder="Pigmentos moleculares resistentes al desteñimiento..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#33172c]/20 outline-none resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addHighlight} className="flex items-center gap-1.5 text-sm text-[#33172c] hover:text-[#4b2c42] font-medium">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Agregar ventaja
          </button>
        </div>

        {/* Accordion content */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contenido del Acordeón</h2>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Detalles e Ingredientes</label>
            <textarea
              value={form.details}
              onChange={(e) => set("details", e.target.value)}
              rows={4}
              placeholder="Describe los ingredientes, materiales o detalles técnicos del producto..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Cómo Usar</label>
            <textarea
              value={form.howToUse}
              onChange={(e) => set("howToUse", e.target.value)}
              rows={4}
              placeholder="Instrucciones de uso paso a paso..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Envíos y Devoluciones</label>
            <textarea
              value={form.shippingInfo}
              onChange={(e) => set("shippingInfo", e.target.value)}
              rows={3}
              placeholder="Información de envío, tiempos y política de devoluciones..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none resize-none"
            />
          </div>
        </div>

        {/* Gallery */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Galería de Imágenes</h2>
          {form.gallery.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {form.gallery.map((url, i) => (
                <div key={i} className="space-y-1">
                  <div className="relative group aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
                    {url && (
                      <Image
                        src={url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 33vw, 50vw"
                      />
                    )}
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
                    placeholder="https://..."
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] focus:ring-1 focus:ring-[#33172c]/20 outline-none"
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, gallery: [...prev.gallery, ""] }))}
              className="flex items-center gap-1.5 text-sm text-[#33172c] hover:text-[#4b2c42] font-medium"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Agregar URL
            </button>
            <button
              type="button"
              onClick={() => galleryFileRef.current?.click()}
              disabled={galleryUploading}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium disabled:opacity-50"
            >
              {galleryUploading
                ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                : <span className="material-symbols-outlined text-[18px]">upload</span>}
              {galleryUploading ? "Subiendo..." : "Subir imagen"}
            </button>
              <input ref={galleryFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
          </div>
        </div>

        {/* Swatches */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Tonos / Swatches</h2>
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
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                />
                <button type="button" onClick={() => removeSwatch(i)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addSwatch} className="flex items-center gap-1.5 text-sm text-[#33172c] hover:text-[#4b2c42] font-medium">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Agregar tono
          </button>
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Reseñas</h2>
          <div className="space-y-4 mb-3">
            {form.reviews.map((r, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3 relative">
                <button type="button" onClick={() => removeReview(i)} className="absolute top-3 right-3 p-1 text-gray-300 hover:text-red-500 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
                <div className="grid grid-cols-2 gap-3 pr-8">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Título</label>
                    <input value={r.title} onChange={(e) => setReview(i, "title", e.target.value)} placeholder='"Magia Pura"' className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#33172c]/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Autor</label>
                    <input value={r.author} onChange={(e) => setReview(i, "author", e.target.value)} placeholder="Elena R." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#33172c]/20 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Texto</label>
                  <textarea value={r.text} onChange={(e) => setReview(i, "text", e.target.value)} rows={2} placeholder="El texto de la reseña..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#33172c]/20 outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Estrellas (1–5)</label>
                  <input type="number" min="1" max="5" step="0.5" value={r.stars} onChange={(e) => setReview(i, "stars", e.target.value)} className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#33172c]/20 outline-none" />
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addReview} className="flex items-center gap-1.5 text-sm text-[#33172c] hover:text-[#4b2c42] font-medium">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Agregar reseña
          </button>
        </div>

        {/* Ciencia del Tono */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">La Ciencia del Tono</h2>
              <p className="text-[11px] text-gray-400 mt-1">Sección informativa sobre ingredientes y tecnología del producto.</p>
            </div>
            <button type="button" onClick={addScienceItem} className="flex items-center gap-1.5 text-xs font-bold text-[#33172c] border border-[#33172c]/30 rounded-xl px-4 py-2 hover:bg-[#33172c]/5 transition-colors">
              <span className="material-symbols-outlined text-[16px]">add</span>
              Agregar ítem
            </button>
          </div>
          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Título de sección</label>
              <input
                value={form.scienceTitle}
                onChange={(e) => set("scienceTitle", e.target.value)}
                placeholder="La Ciencia del Tono"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Descripción</label>
              <textarea
                value={form.scienceDesc}
                onChange={(e) => set("scienceDesc", e.target.value)}
                rows={3}
                placeholder="Nuestra exclusiva fórmula combina..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none resize-none"
              />
            </div>
          </div>

          {form.scienceItems.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Sin ítems. Haz clic en &ldquo;Agregar ítem&rdquo; para crear el primero.</p>
          )}

          <div className="space-y-4">
            {form.scienceItems.map((s, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3 relative">
                <button type="button" onClick={() => removeScienceItem(i)} className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 text-red-400 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
                <div className="grid grid-cols-2 gap-3 pr-8">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Ícono</label>
                    <button
                      type="button"
                      onClick={() => setScienceIconPickerOpen(scienceIconPickerOpen === i ? null : i)}
                      className="flex items-center gap-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#33172c]">{s.icon || "spa"}</span>
                      <span className="text-gray-600 flex-1 text-left">{s.icon || "Elegir ícono"}</span>
                      <span className="material-symbols-outlined text-gray-400 text-[16px]">
                        {scienceIconPickerOpen === i ? "expand_less" : "expand_more"}
                      </span>
                    </button>
                    {scienceIconPickerOpen === i && (
                      <div className="mt-2 border border-gray-200 rounded-xl p-3 grid grid-cols-5 gap-2 bg-gray-50">
                        {HIGHLIGHT_ICONS.map((ic) => (
                          <button
                            key={ic.icon}
                            type="button"
                            title={ic.label}
                            onClick={() => { setScienceItem(i, "icon", ic.icon); setScienceIconPickerOpen(null); }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] transition-colors ${s.icon === ic.icon ? "bg-[#33172c] text-white" : "hover:bg-white text-gray-500"}`}
                          >
                            <span className="material-symbols-outlined text-[20px]">{ic.icon}</span>
                            {ic.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Título</label>
                    <input
                      value={s.title}
                      onChange={(e) => setScienceItem(i, "title", e.target.value)}
                      placeholder="Argán Prensado en Frío"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#33172c]/20 outline-none"
                    />
                  </div>
                </div>
                <textarea
                  value={s.desc}
                  onChange={(e) => setScienceItem(i, "desc", e.target.value)}
                  rows={2}
                  placeholder="Procedente de las montañas del Atlas..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#33172c]/20 outline-none resize-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="flex-1 py-3 bg-[#33172c] text-white rounded-xl text-sm font-bold hover:bg-[#4b2c42] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            {saving ? "Guardando..." : mode === "new" ? "Crear Producto" : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
