"use client";

import { useEffect, useState } from "react";
import MediaInput from "@/components/MediaInput";

interface VideoCard {
  id: string;
  image: string;
  level: string;
  duration: string;
  title: string;
  desc: string;
}

interface FaqItem {
  id: string;
  q: string;
  a: string;
}

function emptyVideo(): VideoCard {
  return { id: `v-${Date.now()}`, image: "", level: "", duration: "", title: "", desc: "" };
}

function emptyFaq(): FaqItem {
  return { id: `f-${Date.now()}`, q: "", a: "" };
}

export default function TutorialsAdminPage() {
  const [videos, setVideos] = useState<VideoCard[]>([]);
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/admin/tutorials")
      .then((r) => r.json())
      .then((data) => {
        setVideos(data.videos ?? []);
        setFaq(data.faq ?? []);
        setLoading(false);
      });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // ── Videos ──
  function updateVideo(idx: number, key: keyof VideoCard, value: string) {
    setVideos((prev) => prev.map((v, i) => i === idx ? { ...v, [key]: value } : v));
  }
  function moveVideo(idx: number, dir: -1 | 1) {
    setVideos((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  function removeVideo(idx: number) {
    setVideos((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── FAQ ──
  function updateFaq(idx: number, key: "q" | "a", value: string) {
    setFaq((prev) => prev.map((f, i) => i === idx ? { ...f, [key]: value } : f));
  }
  function moveFaq(idx: number, dir: -1 | 1) {
    setFaq((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  function removeFaq(idx: number) {
    setFaq((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/tutorials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videos, faq }),
    });
    setSaving(false);
    showToast("Tutoriales guardados correctamente.");
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center py-24">
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

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tutoriales</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gestiona los videos y preguntas frecuentes de la página{" "}
            <span className="font-mono text-xs">/tutorials</span>
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

      <div className="space-y-6">
        {/* ── Video Cards ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Videos ({videos.length})
            </h2>
            <button
              onClick={() => setVideos((prev) => [...prev, emptyVideo()])}
              className="flex items-center gap-1.5 text-xs font-bold text-[#33172c] border border-[#33172c]/30 rounded-xl px-4 py-2 hover:bg-[#33172c]/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Agregar Video
            </button>
          </div>

          {videos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No hay videos. Agrega el primero.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {videos.map((v, idx) => (
                <div key={v.id} className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Video {idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveVideo(idx, -1)} disabled={idx === 0} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                        <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                      </button>
                      <button onClick={() => moveVideo(idx, 1)} disabled={idx === videos.length - 1} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                        <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                      </button>
                      <button onClick={() => removeVideo(idx)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors ml-1">
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </div>

                  <MediaInput
                    label="Imagen de Miniatura"
                    value={v.image}
                    onChange={(url) => updateVideo(idx, "image", url)}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Nivel</label>
                      <input value={v.level} onChange={(e) => updateVideo(idx, "level", e.target.value)} placeholder="Avanzado" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Duración</label>
                      <input value={v.duration} onChange={(e) => updateVideo(idx, "duration", e.target.value)} placeholder="18 Min" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Título</label>
                    <input value={v.title} onChange={(e) => updateVideo(idx, "title", e.target.value)} placeholder="Balayage Perfecto en Casa" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Descripción</label>
                    <textarea value={v.desc} onChange={(e) => updateVideo(idx, "desc", e.target.value)} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none resize-none" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── FAQ ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Preguntas Frecuentes ({faq.length})
            </h2>
            <button
              onClick={() => setFaq((prev) => [...prev, emptyFaq()])}
              className="flex items-center gap-1.5 text-xs font-bold text-[#33172c] border border-[#33172c]/30 rounded-xl px-4 py-2 hover:bg-[#33172c]/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Agregar Pregunta
            </button>
          </div>

          {faq.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No hay preguntas. Agrega la primera.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {faq.map((f, idx) => (
                <div key={f.id} className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pregunta {idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveFaq(idx, -1)} disabled={idx === 0} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                        <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                      </button>
                      <button onClick={() => moveFaq(idx, 1)} disabled={idx === faq.length - 1} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                        <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                      </button>
                      <button onClick={() => removeFaq(idx)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors ml-1">
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Pregunta</label>
                    <input value={f.q} onChange={(e) => updateFaq(idx, "q", e.target.value)} placeholder="¿Cómo elijo el tono?" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Respuesta</label>
                    <textarea value={f.a} onChange={(e) => updateFaq(idx, "a", e.target.value)} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none resize-none" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
