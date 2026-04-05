"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MediaInput from "@/components/MediaInput";
import LinkPicker from "@/components/LinkPicker";

interface Stat { value: string; label: string; }

interface HomeForm {
  tendencias: { label: string; title: string; description: string; linkText: string; linkHref: string; };
  transformacion: {
    label: string; title: string;
    beforeImage: string; afterImage: string; afterLabel: string;
    quote: string; authorName: string; authorRole: string; authorImage: string;
    stats: Stat[];
  };
  seleccion: { label: string; title: string; linkText: string; linkHref: string; };
  newsletter: { enabled: boolean; label: string; title: string; description: string; formType: "email" | "contact"; buttonText: string; };
}

const DEFAULT: HomeForm = {
  tendencias: { label: "Lo Esencial", title: "Tendencias", description: "", linkText: "Ver Todos los Más Vendidos", linkHref: "/products?sort=best" },
  transformacion: {
    label: "El Resultado del Alquimista", title: "Transformación Pura",
    beforeImage: "", afterImage: "", afterLabel: "Después",
    quote: "", authorName: "", authorRole: "", authorImage: "",
    stats: [
      { value: "98%", label: "Tasa de Retención" },
      { value: "450k", label: "Tonos Mezclados" },
      { value: "4.9/5", label: "Calificación de Usuarios" },
    ],
  },
  seleccion: { label: "Edición de Temporada", title: "La Selección de Invierno", linkText: "Explorar Colecciones", linkHref: "/collections" },
  newsletter: { enabled: true, label: "El Círculo Íntimo", title: "Únete a la Sociedad Editorial Alchemist.", description: "", formType: "email", buttonText: "Suscribirse" },
};

function Field({ label, value, onChange, placeholder, textarea }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 resize-y transition"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition"
        />
      )}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/60">
        <span className="material-symbols-outlined text-[#33172c] text-xl">{icon}</span>
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

export default function HomeAdminPage() {
  const router = useRouter();
  const [form, setForm] = useState<HomeForm>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.content?.home) {
          setForm({ ...DEFAULT, ...data.content.home });
        }
        setLoading(false);
      });
  }, []);

  function setT(patch: Partial<HomeForm["tendencias"]>) {
    setForm((f) => ({ ...f, tendencias: { ...f.tendencias, ...patch } }));
  }
  function setTr(patch: Partial<HomeForm["transformacion"]>) {
    setForm((f) => ({ ...f, transformacion: { ...f.transformacion, ...patch } }));
  }
  function setSel(patch: Partial<HomeForm["seleccion"]>) {
    setForm((f) => ({ ...f, seleccion: { ...f.seleccion, ...patch } }));
  }
  function setNl(patch: Partial<HomeForm["newsletter"]>) {
    setForm((f) => ({ ...f, newsletter: { ...f.newsletter, ...patch } }));
  }
  function setStat(i: number, patch: Partial<Stat>) {
    setForm((f) => {
      const stats = [...f.transformacion.stats];
      stats[i] = { ...stats[i], ...patch };
      return { ...f, transformacion: { ...f.transformacion, stats } };
    });
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { home: form } }),
    });
    setSaving(false);
    if (res.ok) {
      setToast("Cambios guardados correctamente.");
      setTimeout(() => setToast(""), 3000);
    }
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
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push("/admin/pages")} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <span className="material-symbols-outlined text-gray-500">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inicio</h1>
          <p className="text-sm text-gray-400 mt-0.5">Edita los textos y contenido de la página de inicio.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* SECCIÓN TENDENCIAS */}
        <SectionCard title="Sección: Tendencias" icon="trending_up">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Etiqueta" value={form.tendencias.label} onChange={(v) => setT({ label: v })} placeholder="Lo Esencial" />
            <Field label="Título" value={form.tendencias.title} onChange={(v) => setT({ title: v })} placeholder="Tendencias" />
          </div>
          <Field label="Descripción" value={form.tendencias.description} onChange={(v) => setT({ description: v })} textarea placeholder="Nuestros tonos y tratamientos más codiciados..." />
          <Field label="Texto del enlace" value={form.tendencias.linkText} onChange={(v) => setT({ linkText: v })} placeholder="Ver Todos los Más Vendidos" />
          <LinkPicker label="Destino del enlace" value={form.tendencias.linkHref} onChange={(v) => setT({ linkHref: v })} />
        </SectionCard>

        {/* SECCIÓN TRANSFORMACIÓN */}
        <SectionCard title="Sección: Transformación Pura" icon="auto_awesome">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Etiqueta" value={form.transformacion.label} onChange={(v) => setTr({ label: v })} placeholder="El Resultado del Alquimista" />
            <Field label="Título" value={form.transformacion.title} onChange={(v) => setTr({ title: v })} placeholder="Transformación Pura" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MediaInput label="Imagen Antes" value={form.transformacion.beforeImage} onChange={(v) => setTr({ beforeImage: v })} />
            <MediaInput label="Imagen Después" value={form.transformacion.afterImage} onChange={(v) => setTr({ afterImage: v })} />
          </div>
          <Field label='Etiqueta "Después"' value={form.transformacion.afterLabel} onChange={(v) => setTr({ afterLabel: v })} placeholder="Después: Rosa Nube" />

          <div className="border-t border-gray-100 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Testimonio</p>
            <Field label="Cita" value={form.transformacion.quote} onChange={(v) => setTr({ quote: v })} textarea placeholder="La precisión de los pigmentos es incomparable..." />
            <div className="grid grid-cols-2 gap-4 mt-3">
              <Field label="Nombre del autor" value={form.transformacion.authorName} onChange={(v) => setTr({ authorName: v })} placeholder="Helena Thorne" />
              <Field label="Cargo / Rol" value={form.transformacion.authorRole} onChange={(v) => setTr({ authorRole: v })} placeholder="Alquimista Verificada · Londres, UK" />
            </div>
            <div className="mt-3">
              <MediaInput label="Foto del autor" value={form.transformacion.authorImage} onChange={(v) => setTr({ authorImage: v })} previewClass="mt-2 w-12 h-12 rounded-full object-cover" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Estadísticas (3)</p>
            <div className="grid grid-cols-3 gap-3">
              {(form.transformacion.stats).map((stat, i) => (
                <div key={i} className="space-y-2">
                  <Field label={`Valor ${i + 1}`} value={stat.value} onChange={(v) => setStat(i, { value: v })} placeholder="98%" />
                  <Field label={`Etiqueta ${i + 1}`} value={stat.label} onChange={(v) => setStat(i, { label: v })} placeholder="Tasa de Retención" />
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* SECCIÓN SELECCIÓN */}
        <SectionCard title="Sección: Colecciones Destacadas" icon="collections">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Etiqueta" value={form.seleccion.label} onChange={(v) => setSel({ label: v })} placeholder="Edición de Temporada" />
            <Field label="Título" value={form.seleccion.title} onChange={(v) => setSel({ title: v })} placeholder="La Selección de Invierno" />
          </div>
          <Field label="Texto del enlace" value={form.seleccion.linkText} onChange={(v) => setSel({ linkText: v })} placeholder="Explorar Colecciones" />
          <LinkPicker label="Destino del enlace" value={form.seleccion.linkHref} onChange={(v) => setSel({ linkHref: v })} />
        </SectionCard>

        {/* SECCIÓN NEWSLETTER */}
        <SectionCard title="Sección: Newsletter / CTA" icon="mail">
          {/* Toggle enabled */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Mostrar sección</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Activa o desactiva el bloque de newsletter en la tienda.</p>
            </div>
            <button
              type="button"
              onClick={() => setNl({ enabled: !form.newsletter.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.newsletter.enabled ? "bg-[#33172c]" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.newsletter.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className={form.newsletter.enabled ? "" : "opacity-40 pointer-events-none"}>
            {/* Tipo de formulario */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Tipo de formulario</label>
              <div className="flex gap-2">
                {(["email", "contact"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNl({ formType: type })}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      form.newsletter.formType === type
                        ? "bg-[#33172c] text-white border-[#33172c]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-[#33172c]/40"
                    }`}
                  >
                    {type === "email" ? "Solo correo" : "Formulario de contacto"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Etiqueta" value={form.newsletter.label} onChange={(v) => setNl({ label: v })} placeholder="El Círculo Íntimo" />
              <Field label="Texto del botón" value={form.newsletter.buttonText} onChange={(v) => setNl({ buttonText: v })} placeholder="Suscribirse" />
            </div>
            <Field label="Título" value={form.newsletter.title} onChange={(v) => setNl({ title: v })} placeholder="Únete a la Sociedad..." />
            <Field label="Descripción" value={form.newsletter.description} onChange={(v) => setNl({ description: v })} textarea placeholder="Sé el primero en acceder a lanzamientos exclusivos..." />
          </div>
        </SectionCard>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-3 mt-8">
        <button onClick={() => router.push("/admin/pages")} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
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
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
