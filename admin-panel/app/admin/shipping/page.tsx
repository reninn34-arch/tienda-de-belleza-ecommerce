"use client";

import { useEffect, useState } from "react";

interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  enabled: boolean;
  minOrder?: number;
}

export default function AdminShippingPage() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [taxInput, setTaxInput] = useState<string>("0");
  const [savingTax, setSavingTax] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState("");
  const [newMethod, setNewMethod] = useState<Omit<ShippingMethod, "id">>(
    { name: "", description: "", price: 0, enabled: true },
  );

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((s) => {
      setMethods(s.shipping.methods);
      const rate = s.taxRate ?? 0;
      setTaxRate(rate);
      setTaxInput(String(rate));
    });
  }, []);

  async function saveTaxRate() {
    setSavingTax(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxRate: parseFloat(taxInput) || 0 }),
    });
    setTaxRate(parseFloat(taxInput) || 0);
    setSavingTax(false);
    showToast("IVA guardado.");
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function save(updatedMethods: ShippingMethod[]) {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipping: { methods: updatedMethods } }),
    });
    setSaving(false);
    showToast("Métodos de envío guardados.");
  }

  function toggle(id: string) {
    const updated = methods.map((m) => m.id === id ? { ...m, enabled: !m.enabled } : m);
    setMethods(updated);
    save(updated);
  }

  function updateMethod(id: string, key: keyof ShippingMethod, value: string | number | boolean) {
    setMethods((prev) => prev.map((m) => m.id === id ? { ...m, [key]: value } : m));
  }

  async function saveMethod() {
    await save(methods);
    setEditing(null);
  }

  async function deleteMethod(id: string) {
    const updated = methods.filter((m) => m.id !== id);
    setMethods(updated);
    await save(updated);
  }

  async function addMethod() {
    const id = newMethod.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const updated = [...methods, { ...newMethod, id }];
    setMethods(updated);
    await save(updated);
    setShowNew(false);
    setNewMethod({ name: "", description: "", price: 0, enabled: true });
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {toast}
        </div>
      )}

      {/* IVA / Tax Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] text-purple-600">percent</span>
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Impuesto (IVA)</h2>
            <p className="text-xs text-gray-400">Se aplica sobre el subtotal en el checkout.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-[180px]">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={taxInput}
              onChange={(e) => setTaxInput(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-9 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">%</span>
          </div>
          <button
            onClick={saveTaxRate}
            disabled={savingTax}
            className="px-5 py-2.5 bg-[#33172c] text-white rounded-xl text-sm font-bold hover:bg-[#4b2c42] transition-colors disabled:opacity-60"
          >
            {savingTax ? "Guardando..." : "Guardar"}
          </button>
          {taxRate === 0 && (
            <span className="text-xs text-gray-400">Sin impuesto</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Métodos de Envío</h1>
          <p className="text-sm text-gray-400 mt-1">Administra los métodos de envío disponibles en la tienda.</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#33172c] text-white text-sm font-bold rounded-xl hover:bg-[#4b2c42] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo Método
        </button>
      </div>

      {/* New method form */}
      {showNew && (
        <div className="bg-white rounded-2xl p-6 border-2 border-[#33172c]/20 shadow-sm mb-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Nuevo Método de Envío</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Nombre *</label>
              <input value={newMethod.name} onChange={(e) => setNewMethod((p) => ({ ...p, name: e.target.value }))} placeholder="Envío Exprés" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Precio (USD)</label>
              <input type="number" step="0.01" min="0" value={newMethod.price} onChange={(e) => setNewMethod((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Descripción</label>
              <input value={newMethod.description} onChange={(e) => setNewMethod((p) => ({ ...p, description: e.target.value }))} placeholder="1–2 días hábiles" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowNew(false)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">Cancelar</button>
            <button onClick={addMethod} disabled={!newMethod.name} className="px-5 py-2 bg-[#33172c] text-white rounded-xl text-sm font-bold hover:bg-[#4b2c42] transition-colors disabled:opacity-50">Agregar</button>
          </div>
        </div>
      )}

      {/* Methods list */}
      <div className="space-y-4">
        {methods.map((method) => (
          <div key={method.id} className={`bg-white rounded-2xl border shadow-sm transition-all ${method.enabled ? "border-gray-100" : "border-gray-100 opacity-60"}`}>
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${method.enabled ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                  <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{method.name}</p>
                  <p className="text-xs text-gray-400">{method.description} · <strong>${method.price.toFixed(2)}</strong></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(editing === method.id ? null : method.id)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-[#33172c]">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onClick={() => deleteMethod(method.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
                <label className="relative inline-flex items-center cursor-pointer ml-1">
                  <input type="checkbox" checked={method.enabled} onChange={() => toggle(method.id)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#33172c] transition-colors after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
            </div>

            {editing === method.id && (
              <div className="px-5 pb-5 pt-0 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Nombre</label>
                    <input value={method.name} onChange={(e) => updateMethod(method.id, "name", e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Precio (USD)</label>
                    <input type="number" step="0.01" min="0" value={method.price} onChange={(e) => updateMethod(method.id, "price", parseFloat(e.target.value) || 0)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Descripción</label>
                    <input value={method.description} onChange={(e) => updateMethod(method.id, "description", e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setEditing(null)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">Cancelar</button>
                  <button onClick={() => saveMethod()} disabled={saving} className="px-5 py-2 bg-[#33172c] text-white rounded-xl text-sm font-bold hover:bg-[#4b2c42] transition-colors">Guardar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
