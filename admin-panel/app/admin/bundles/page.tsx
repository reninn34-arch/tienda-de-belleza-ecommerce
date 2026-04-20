"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductOption {
  id: string;
  name: string;
  image?: string | null;
  price: number;
  cost?: number;
  inventories?: { branchId: string; stock: number }[];
}

interface BundleItemForm {
  productId: string;
  quantity: number;
  product?: ProductOption;
}

interface Bundle {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  taxRate?: number;
  image?: string | null;
  active: boolean;
  branchIds: string[];
  customStockLimit: number | null;
  stockDisponible: number;
  precioIndividual: number;
  ahorro: number;
  ahorroPercent: number;
  items: {
    id: number;
    productId: string;
    quantity: number;
    product: ProductOption & { cost?: number };
  }[];
  costoTotal?: number;
}

interface Branch {
  id: string;
  name: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchProduct, setSearchProduct] = useState("");
  const [searchDropdown, setSearchDropdown] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    image: "",
    active: true,
    taxRate: 0,
    branchIds: [] as string[],
    customStockLimit: "" as string | number,
  });
  const [items, setItems] = useState<BundleItemForm[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchBundles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bundles");
      const data = await res.json();
      setBundles(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBundles();
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => { });

    fetch("/api/admin/branches")
      .then(r => r.json())
      .then(data => setBranches(Array.isArray(data) ? data : []))
      .catch(() => { });
  }, [fetchBundles]);

  // ── Toast helper ───────────────────────────────────────────────────────────

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Editor helpers ─────────────────────────────────────────────────────────

  function openNew() {
    setForm({ name: "", description: "", price: "", image: "", active: true, taxRate: 0, branchIds: [], customStockLimit: "" });
    setItems([]);
    setEditingId(null);
    setShowEditor(true);
  }

  function openEdit(b: Bundle) {
    setForm({
      name: b.name,
      description: b.description ?? "",
      price: String(b.price),
      image: b.image ?? "",
      active: b.active,
      taxRate: b.taxRate ?? 0,
      branchIds: b.branchIds || [],
      customStockLimit: b.customStockLimit !== null ? String(b.customStockLimit) : "",
    });
    setItems(
      b.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        product: i.product,
      }))
    );
    setEditingId(b.id);
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingId(null);
    setSearchProduct("");
  }

  // ── Product search in editor ───────────────────────────────────────────────

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) &&
      !items.some((i) => i.productId === p.id)
  );

  function addProduct(p: ProductOption) {
    setItems((prev) => [...prev, { productId: p.id, quantity: 1, product: p }]);
    setSearchProduct("");
    setSearchDropdown(false);
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function updateQty(productId: string, qty: number) {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i))
    );
  }

  // ── Image Upload ───────────────────────────────────────────────────────────

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setForm((f) => ({ ...f, image: data.url }));
        showToast("Imagen subida", true);
      } else {
        showToast("Error al subir imagen", false);
      }
    } catch {
      showToast("Error de conexión", false);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Save bundle ────────────────────────────────────────────────────────────

  async function saveBundle() {
    if (!form.name.trim()) return showToast("El nombre es requerido", false);
    if (!form.price || isNaN(Number(form.price))) return showToast("Precio inválido", false);
    if (items.length === 0) return showToast("Agrega al menos un producto al kit", false);

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description || null,
        price: parseFloat(form.price),
        image: form.image || null,
        active: form.active,
        taxRate: parseFloat(String(form.taxRate)) || 0,
        branchIds: form.branchIds,
        customStockLimit: form.customStockLimit !== "" ? parseInt(String(form.customStockLimit)) : null,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      };

      const url = editingId ? `/api/admin/bundles/${editingId}` : "/api/admin/bundles";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Error al guardar");
      showToast(editingId ? "Bundle actualizado ✓" : "Bundle creado ✓");
      closeEditor();
      fetchBundles();
    } catch {
      showToast("Error al guardar el bundle", false);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete bundle ──────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await fetch(`/api/admin/bundles/${deleteId}`, { method: "DELETE" });
      showToast("Bundle eliminado");
      fetchBundles();
    } catch {
      showToast("Error al eliminar", false);
    } finally {
      setDeleteId(null);
    }
  }

  // ── Calculated price preview ───────────────────────────────────────────────

  const individualTotal = items.reduce(
    (sum, i) => sum + (i.product?.price ?? 0) * i.quantity,
    0
  );
  const costTotal = items.reduce(
    (sum, i) => sum + (i.product?.cost ?? 0) * i.quantity,
    0
  );

  const bundlePrice = parseFloat(form.price) || 0;
  const saving_ = individualTotal - bundlePrice;
  const savePct = individualTotal > 0 ? Math.round((saving_ / individualTotal) * 100) : 0;

  const profit = bundlePrice - costTotal;
  const profitPct = bundlePrice > 0 ? Math.round((profit / bundlePrice) * 100) : 0;
  const isLoss = profit < 0;
  const isLowMargin = profitPct < 15 && !isLoss;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f6f7f9]" style={{ fontFamily: "Manrope, sans-serif" }}>

      {/* ─── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[100] px-4 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 transition-all ${toast.ok ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
            }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.ok ? "check_circle" : "error"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ─── Delete confirm ─────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[#1f1030] mb-2">¿Eliminar bundle?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Editor Modal ───────────────────────────────────────────────── */}
      {showEditor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-[#1f1030]">
                  {editingId ? "Editar Bundle" : "Nuevo Bundle (Kit)"}
                </h2>
                <p className="text-[13px] text-gray-400 mt-0.5">
                  Combina productos y define un precio especial
                </p>
              </div>
              <button
                onClick={closeEditor}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Name & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                    Nombre del Kit *
                  </label>
                  <input
                    id="bundle-name"
                    type="text"
                    placeholder="Ej: Kit Básico de Maquillaje"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#bc93ad] focus:ring-2 focus:ring-[#bc93ad]/20 outline-none text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                    Precio del Bundle *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">$</span>
                    <input
                      id="bundle-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#bc93ad] focus:ring-2 focus:ring-[#bc93ad]/20 outline-none text-sm transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                    IVA (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={form.taxRate}
                    onChange={(e) => setForm((f) => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#bc93ad] focus:ring-2 focus:ring-[#bc93ad]/20 outline-none text-sm transition-all"
                  />
                </div>
                <div className="col-span-2 flex flex-col justify-end mt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <div
                      onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                      className={`relative w-11 h-6 rounded-full transition-colors ${form.active ? "bg-[#bc93ad]" : "bg-gray-200"
                        }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.active ? "translate-x-5" : "translate-x-0"
                          }`}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-600">
                      {form.active ? "Activo" : "Inactivo"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Descripción
                </label>
                <textarea
                  id="bundle-description"
                  rows={2}
                  placeholder="Describe el kit brevemente..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#bc93ad] focus:ring-2 focus:ring-[#bc93ad]/20 outline-none text-sm resize-none transition-all"
                />
              </div>

              {/* Branch Selector & Stock Limit */}
              <div className="grid grid-cols-2 gap-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Sucursales disponibles
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {branches.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Cargando sucursales...</p>
                    ) : (
                      branches.map(branch => (
                        <label key={branch.id} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={form.branchIds.includes(branch.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setForm(f => ({
                                ...f,
                                branchIds: checked
                                  ? [...f.branchIds, branch.id]
                                  : f.branchIds.filter(id => id !== branch.id)
                              }));
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-[#bc93ad] focus:ring-[#bc93ad]"
                          />
                          <span className="text-sm text-gray-600 group-hover:text-[#1f1030] transition-colors">
                            {branch.name}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Si no seleccionas ninguna, se considerará disponible en todas.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Límite de Stock Manual
                  </label>
                  <input
                    type="number"
                    placeholder="Sin límite (dinámico)"
                    value={form.customStockLimit}
                    onChange={(e) => setForm(f => ({ ...f, customStockLimit: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#bc93ad] focus:ring-2 focus:ring-[#bc93ad]/20 outline-none text-sm transition-all"
                  />
                  <p className="text-[10px] text-gray-400 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50">
                    <span className="font-bold text-indigo-600 uppercase">¿Para qué sirve?</span><br />
                    Define un tope máximo de kits para vender (ej: una promo limitada).
                    Si no pones nada, el stock será 100% dinámico según tus componentes.
                  </p>
                </div>
              </div>

              {/* Image URL & Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Imagen del Kit
                </label>
                <div className="flex gap-4 items-start">
                  <div className="relative w-20 h-20 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0 flex items-center justify-center group">
                    {form.image ? (
                      <>
                        <img
                          src={form.image}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, image: "" }))}
                          className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          title="Eliminar imagen"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </>
                    ) : (
                      <span className="material-symbols-outlined text-gray-300 text-2xl">image</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <input
                      id="bundle-image"
                      type="url"
                      placeholder="https://... o sube una imagen"
                      value={form.image}
                      onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#bc93ad] focus:ring-2 focus:ring-[#bc93ad]/20 outline-none text-sm transition-all"
                    />
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-gray-400">— o —</p>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {uploading ? (
                          <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-[16px]">upload</span>
                        )}
                        {uploading ? "Subiendo..." : "Subir archivo"}
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Product search */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Agregar productos al kit
                </label>
                <div className="relative" ref={searchRef}>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300">
                      <span className="material-symbols-outlined text-[18px]">search</span>
                    </span>
                    <input
                      id="bundle-product-search"
                      type="text"
                      placeholder="Buscar producto por nombre..."
                      value={searchProduct}
                      onChange={(e) => {
                        setSearchProduct(e.target.value);
                        setSearchDropdown(true);
                      }}
                      onFocus={() => setSearchDropdown(true)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#bc93ad] focus:ring-2 focus:ring-[#bc93ad]/20 outline-none text-sm transition-all"
                    />
                  </div>

                  {searchDropdown && searchProduct && filteredProducts.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                      {filteredProducts.slice(0, 8).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => addProduct(p)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#f6f7f9] transition-colors text-left"
                        >
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-8 h-8 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-[16px] text-gray-400">image</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#1f1030] truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">${p.price.toFixed(2)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Items list */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Productos en el kit ({items.length})
                  </p>
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                    >
                      {item.product?.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-[18px] text-gray-400">image</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1f1030] truncate">
                          {item.product?.name ?? item.productId}
                        </p>
                        <p className="text-xs text-gray-400">
                          ${item.product?.price?.toFixed(2) ?? "—"}/u
                        </p>
                        {/* Stock Preview */}
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[12px] text-gray-400">inventory_2</span>
                          <span className={`text-[10px] font-bold ${
                            (item.product?.inventories?.reduce((s,i) => s+i.stock, 0) ?? 0) > 0 
                              ? 'text-emerald-600' 
                              : 'text-rose-500 animate-pulse'
                          }`}>
                            Stock Total: {item.product?.inventories?.reduce((s,i) => s+i.stock, 0) ?? 0}
                          </span>
                        </div>
                      </div>
                      {/* Qty control */}
                      <div className="flex flex-col items-center gap-1 flex-shrink-0 px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest">Incluye</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQty(item.productId, parseInt(e.target.value) || 1)}
                            className="w-12 text-center text-sm font-black text-[#1f1030] bg-gray-50 rounded-lg py-1 focus:ring-2 focus:ring-indigo-200 outline-none border-none"
                          />
                          <span className="text-xs font-bold text-gray-400">u.</span>
                        </div>
                        <span className="text-[9px] text-gray-400 font-medium italic">por cada Kit</span>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-300 hover:text-rose-500 transition-colors flex-shrink-0"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Price Summary */}
              {items.length > 0 && (
                <div className="rounded-2xl border border-[#bc93ad]/30 bg-gradient-to-tr from-[#fcf9fb] to-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#bc93ad]">analytics</span>
                    <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-[0.1em]">Análisis de Rentabilidad</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Ahorro para el Cliente</p>
                      <div className="flex flex-col">
                        <span className="text-xl font-black text-emerald-600">
                          ${saving_ > 0 ? saving_.toFixed(2) : "0.00"}
                        </span>
                        {saving_ > 0 && (
                          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full self-start">
                             Oferta: {savePct}% menos
                          </span>
                        )}
                        {saving_ < 0 && (
                          <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full self-start">
                             Precio por encima del valor individual
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Margen Real (Tu Ganancia)</p>
                      <div className="flex flex-col items-end">
                        <span className={`text-xl font-black ${isLoss ? "text-rose-600" : isLowMargin ? "text-orange-500" : "text-indigo-700"}`}>
                          ${profit.toFixed(2)}
                        </span>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                          isLoss ? "bg-rose-100 text-rose-700 animate-pulse" : isLowMargin ? "bg-orange-50 text-orange-600" : "bg-indigo-50 text-indigo-700"
                        }`}>
                          {profitPct}% Ganancia
                        </div>
                      </div>
                    </div>
                  </div>

                  {isLoss && (
                    <div className="bg-rose-600 text-white p-3 rounded-xl text-xs font-bold flex items-center gap-3 animate-bounce shadow-lg shadow-rose-200">
                      <span className="material-symbols-outlined text-[20px]">dangerous</span>
                      <div>
                        ¡ESTE KIT GENERA PÉRDIDAS!
                        <p className="text-[10px] opacity-90 font-medium">El costo de los componentes (${costTotal.toFixed(2)}) supera el precio de venta.</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-100 grid grid-cols-2 text-[11px]">
                    <div className="text-gray-400">
                      Costo componentes: <span className="font-mono text-gray-600">${costTotal.toFixed(2)}</span>
                    </div>
                    <div className="text-right text-gray-400">
                      Valor original: <span className="font-mono text-gray-600">${individualTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeEditor}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  id="bundle-save-btn"
                  onClick={saveBundle}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#1f1030] text-white text-sm font-semibold hover:bg-[#2d1a44] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">save</span>
                  )}
                  {saving ? "Guardando..." : editingId ? "Actualizar Bundle" : "Crear Bundle"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Page Content ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1f1030]">Bundles (Kits)</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Combina productos en kits con precios especiales
            </p>
          </div>
          <button
            id="new-bundle-btn"
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1f1030] text-white text-sm font-semibold hover:bg-[#2d1a44] transition-colors shadow-lg shadow-[#1f1030]/20"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nuevo Bundle
          </button>
        </div>

        {/* Stats */}
        {!loading && bundles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Total Bundles",
                value: bundles.length,
                icon: "deployed_code",
                color: "from-violet-500 to-purple-600",
              },
              {
                label: "Activos",
                value: bundles.filter((b) => b.active).length,
                icon: "check_circle",
                color: "from-emerald-500 to-teal-600",
              },
              {
                label: "Sin stock",
                value: bundles.filter((b) => b.stockDisponible === 0).length,
                icon: "inventory",
                color: "from-rose-500 to-red-600",
              },
              {
                label: "Ahorro prom.",
                value: `${Math.round(bundles.reduce((s, b) => s + b.ahorroPercent, 0) / bundles.length)}%`,
                icon: "sell",
                color: "from-amber-500 to-orange-500",
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                  <span className="material-symbols-outlined text-white text-[20px]">{stat.icon}</span>
                </div>
                <p className="text-2xl font-extrabold text-[#1f1030]">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Bundles Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-[3px] border-[#bc93ad] border-t-transparent animate-spin" />
          </div>
        ) : bundles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-[#f6edf5] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[40px] text-[#bc93ad]">deployed_code</span>
            </div>
            <h3 className="text-lg font-bold text-[#1f1030] mb-1">No hay bundles aún</h3>
            <p className="text-sm text-gray-400 max-w-xs mb-6">
              Crea kits de productos con descuentos especiales para aumentar tu ticket promedio.
            </p>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1f1030] text-white text-sm font-semibold hover:bg-[#2d1a44] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Crear primer Bundle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {bundles.map((bundle) => (
              <div
                key={bundle.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Bundle image */}
                <div className="relative h-40 bg-gradient-to-br from-[#f6edf5] to-[#ede8f5] overflow-hidden">
                  {bundle.image ? (
                    <img
                      src={bundle.image}
                      alt={bundle.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      {/* Mini product image collage */}
                      <div className="flex gap-1.5">
                        {bundle.items.slice(0, 3).map((item) =>
                          item.product?.image ? (
                            <img
                              key={item.productId}
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-12 h-12 rounded-lg object-cover shadow-md"
                            />
                          ) : (
                            <div
                              key={item.productId}
                              className="w-12 h-12 rounded-lg bg-white/60 flex items-center justify-center"
                            >
                              <span className="material-symbols-outlined text-[20px] text-[#bc93ad]">inventory_2</span>
                            </div>
                          )
                        )}
                        {bundle.items.length > 3 && (
                          <div className="w-12 h-12 rounded-lg bg-white/60 flex items-center justify-center text-[#bc93ad] text-xs font-bold">
                            +{bundle.items.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {!bundle.active && (
                      <span className="px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-bold">
                        INACTIVO
                      </span>
                    )}
                    {bundle.stockDisponible === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/90 text-white text-[10px] font-bold">
                        SIN STOCK
                      </span>
                    )}
                  </div>
                  {bundle.ahorroPercent > 0 && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-md">
                        -{bundle.ahorroPercent}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-[#1f1030] truncate mb-0.5">{bundle.name}</h3>
                  {bundle.description && (
                    <p className="text-xs text-gray-400 line-clamp-1 mb-3">{bundle.description}</p>
                  )}

                  {/* Pricing */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-xl font-extrabold text-[#1f1030]">
                      ${bundle.price.toFixed(2)}
                    </span>
                    {bundle.ahorro > 0 && (
                      <span className="text-xs text-gray-400 line-through">
                        ${bundle.precioIndividual.toFixed(2)}
                      </span>
                    )}
                    {bundle.ahorro > 0 && (
                      <span className="text-xs font-bold text-emerald-600 ml-auto">
                        Ahorra ${bundle.ahorro.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Composed of */}
                  <div className="flex gap-1 flex-wrap mb-3">
                    {bundle.items.map((item) => (
                      <span
                        key={item.productId}
                        className="px-2 py-0.5 rounded-full bg-[#f6edf5] text-[#7a3e6e] text-[11px] font-semibold"
                      >
                        {item.quantity > 1 ? `${item.quantity}× ` : ""}
                        {item.product?.name?.split(" ").slice(0, 2).join(" ")}
                      </span>
                    ))}
                  </div>

                  {/* Stock */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                    <span className="material-symbols-outlined text-[14px]">inventory</span>
                    <span>
                      <strong
                        className={
                          bundle.stockDisponible === 0
                            ? "text-rose-500"
                            : bundle.stockDisponible <= 3
                              ? "text-amber-500"
                              : "text-emerald-600"
                        }
                      >
                        {bundle.stockDisponible}
                      </strong>{" "}
                      kits disponibles
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      id={`edit-bundle-${bundle.id}`}
                      onClick={() => openEdit(bundle)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      Editar
                    </button>
                    <button
                      id={`delete-bundle-${bundle.id}`}
                      onClick={() => setDeleteId(bundle.id)}
                      className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
