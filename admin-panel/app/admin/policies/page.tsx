"use client";

import { useEffect, useState } from "react";

interface Policy {
  id: string;
  title: string;
  slug: string;
  icon: string;
  content: string;
}

const ICON_OPTIONS = [
  { value: "description", label: "Documento" },
  { value: "assignment_return", label: "Devoluciones" },
  { value: "local_shipping", label: "Envíos" },
  { value: "privacy_tip", label: "Privacidad" },
  { value: "gavel", label: "Términos" },
  { value: "cookie", label: "Cookies" },
  { value: "security", label: "Seguridad" },
  { value: "help", label: "Ayuda" },
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[] | null>(null);
  const [activeId, setActiveId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newIcon, setNewIcon] = useState("description");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((s) => {
        const p: Policy[] = s.policies ?? [];
        setPolicies(p);
        if (p.length > 0) setActiveId(p[0].id);
      });
  }, []);

  const active = policies?.find((p) => p.id === activeId);

  function updateContent(content: string) {
    setPolicies((prev) => prev ? prev.map((p) => p.id === activeId ? { ...p, content } : p) : prev);
  }

  function updateField(field: keyof Policy, value: string) {
    setPolicies((prev) => prev ? prev.map((p) => p.id === activeId ? { ...p, [field]: value } : p) : prev);
  }

  function addPolicy() {
    if (!newTitle.trim()) return;
    const id = `policy-${Date.now()}`;
    const slug = slugify(newTitle);
    const policy: Policy = { id, title: newTitle.trim(), slug, icon: newIcon, content: `# ${newTitle.trim()}\n\n` };
    setPolicies((prev) => [...(prev ?? []), policy]);
    setActiveId(id);
    setShowNewForm(false);
    setNewTitle("");
    setNewIcon("description");
  }

  function deletePolicy(id: string) {
    const updated = (policies ?? []).filter((p) => p.id !== id);
    setPolicies(updated);
    setActiveId(updated[0]?.id ?? "");
  }

  async function handleSave() {
    if (!policies) return;
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policies }),
    });
    setSaving(false);
    setToast("Políticas guardadas correctamente.");
    setTimeout(() => setToast(""), 3000);
  }

  if (!policies) {
    return (
      <div className="p-4 sm:p-8 flex justify-center">
        <span className="w-7 h-7 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Políticas de la Tienda</h1>
          <p className="text-sm text-gray-400 mt-1">Las políticas se muestran en el footer y tienen su propia página en la tienda.</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#33172c] text-white rounded-xl text-sm font-semibold hover:bg-[#4b2c42] transition-colors self-start sm:self-auto flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva Política
        </button>
      </div>

      {/* New policy form */}
      {showNewForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Nueva Política</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Título</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33172c]/20"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="ej: Política de Cookies"
              />
              {newTitle && (
                <p className="text-[10px] text-gray-400 mt-1">URL: /policies/{slugify(newTitle)}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Ícono</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33172c]/20"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
              >
                {ICON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={addPolicy}
              disabled={!newTitle.trim()}
              className="px-4 py-2 bg-[#33172c] text-white rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-[#4b2c42] transition-colors"
            >
              Crear
            </button>
            <button
              onClick={() => { setShowNewForm(false); setNewTitle(""); }}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Sidebar — horizontal scroll on mobile, vertical on sm+ */}
        <div className="sm:w-52 sm:shrink-0">
          {/* Mobile: horizontal scrollable pills */}
          <div className="sm:hidden overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
              {policies.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                    activeId === p.id ? "bg-[#33172c] text-white" : "text-gray-500 bg-white border border-gray-200"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">{p.icon || "description"}</span>
                  {p.title}
                </button>
              ))}
            </div>
          </div>
          {/* Desktop: vertical list */}
          <div className="hidden sm:flex flex-col gap-1">
            {policies.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveId(p.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-colors ${
                  activeId === p.id ? "bg-[#33172c] text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{p.icon || "description"}</span>
                <span className="truncate">{p.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0">
          {active ? (
            <div className="space-y-5">
              {/* Meta fields */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Título</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33172c]/20"
                      value={active.title}
                      onChange={(e) => updateField("title", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Ícono</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33172c]/20"
                      value={active.icon}
                      onChange={(e) => updateField("icon", e.target.value)}
                    >
                      {ICON_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Slug (URL)</label>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50">
                      <span className="text-gray-400">/policies/</span>
                      <input
                        className="flex-1 bg-transparent outline-none text-gray-700"
                        value={active.slug}
                        onChange={(e) => updateField("slug", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Content editor */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs text-gray-400 mb-3">Markdown básico: # Título, ## Subtítulo, **negrita**, *cursiva*</p>
                <textarea
                  value={active.content}
                  onChange={(e) => updateContent(e.target.value)}
                  rows={18}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Delete — only for custom policies */}
              {active.id.startsWith("policy-") && (
                <button
                  onClick={() => deletePolicy(active.id)}
                  className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm font-semibold transition-colors"
                >
                  <span className="material-symbols-outlined text-[17px]">delete</span>
                  Eliminar esta política
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400 text-sm">
              Selecciona una política para editarla
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-8 w-full py-3.5 bg-[#33172c] text-white rounded-xl text-sm font-bold hover:bg-[#4b2c42] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
        {saving ? "Guardando..." : "Guardar Políticas"}
      </button>
    </div>
  );
}
