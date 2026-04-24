"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Branding {
  logoUrl: string;
  faviconUrl: string;
  brandColor?: string;
}

export default function IdentityPage() {
  const [storeName, setStoreName] = useState("");
  const [branding, setBranding] = useState<Branding>({ logoUrl: "", faviconUrl: "" });
  const [uploadingBrand, setUploadingBrand] = useState<"logo" | "favicon" | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((s) => {
        setStoreName(s.storeName ?? "");
        setBranding(s.branding ?? { logoUrl: "", faviconUrl: "" });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function uploadBrandAsset(key: "logo" | "favicon", file: File) {
    setUploadingBrand(key);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await res.json();
    if (data.url) {
      setBranding((prev) => ({
        ...prev,
        [key === "logo" ? "logoUrl" : "faviconUrl"]: data.url,
      }));
    }
    setUploadingBrand(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName, branding }),
      });
      if (res.ok) {
        setToast({ msg: "Identidad guardada correctamente.", ok: true });
      } else {
        setToast({ msg: "Error al guardar. Intenta de nuevo.", ok: false });
      }
    } catch {
      setToast({ msg: "Error de conexión.", ok: false });
    }
    setSaving(false);
    setTimeout(() => setToast(null), 3000);
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <span className="w-7 h-7 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9]" style={{ fontFamily: "Manrope, sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 text-white transition-all ${
            toast.ok ? "bg-emerald-600" : "bg-red-500"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {toast.ok ? "check_circle" : "error"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        accept="image/*"
        ref={logoRef}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadBrandAsset("logo", f);
        }}
      />
      <input
        type="file"
        accept="image/*,.ico"
        ref={faviconRef}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadBrandAsset("favicon", f);
        }}
      />

      {/* Page header */}
      <div
        className="relative overflow-hidden px-8 py-8"
        style={{ background: "linear-gradient(135deg, #1f1030 0%, #33172c 100%)" }}
      >
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute top-6 right-40 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-4 max-w-3xl">
          <Link
            href="/admin/settings"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </Link>
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-white text-[20px]">store</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
              Configuración
            </p>
            <h1 className="text-xl font-bold text-white">General e Identidad</h1>
            <p className="text-[12px] text-white/50 mt-0.5">
              Nombre de la tienda, logo y favicon
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-8 py-8 space-y-6">

        {/* Nombre de la tienda */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1f1030, #33172c)" }}
            >
              <span className="material-symbols-outlined text-[18px] text-white">badge</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Nombre de la Tienda</h2>
              <p className="text-[11px] text-gray-400">
                Aparece en el login, el panel de admin y la pestaña del navegador.
              </p>
            </div>
          </div>
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Blush Beauty"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none transition-all"
          />
        </div>

        {/* Logo */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1f1030, #33172c)" }}
            >
              <span className="material-symbols-outlined text-[18px] text-white">image</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Logo de la Tienda</h2>
              <p className="text-[11px] text-gray-400">
                Reemplaza el nombre de texto en el header. Recomendado: PNG transparente, altura ~40 px.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              value={branding.logoUrl}
              onChange={(e) => setBranding((prev) => ({ ...prev, logoUrl: e.target.value }))}
              placeholder="https://... o sube una imagen"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => logoRef.current?.click()}
              disabled={uploadingBrand === "logo"}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {uploadingBrand === "logo" ? (
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                  Subir
                </>
              )}
            </button>
            {branding.logoUrl && (
              <button
                type="button"
                onClick={() => setBranding((prev) => ({ ...prev, logoUrl: "" }))}
                className="px-3 py-2.5 border border-red-100 text-red-400 rounded-xl hover:bg-red-50 transition-colors"
                title="Eliminar logo"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            )}
          </div>

          {branding.logoUrl && (
            <div className="mt-4 bg-[#faf9f6] border border-gray-100 rounded-xl px-5 py-4 inline-flex items-center gap-3">
              <Image
                src={branding.logoUrl}
                alt="Logo preview"
                width={200}
                height={40}
                className="h-10 max-w-[200px] object-contain"
                sizes="200px"
              />
              <span className="text-[11px] text-gray-400">Vista previa</span>
            </div>
          )}
        </div>

        {/* Favicon */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1f1030, #33172c)" }}
            >
              <span className="material-symbols-outlined text-[18px] text-white">tab</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Favicon (ícono de pestaña)</h2>
              <p className="text-[11px] text-gray-400">
                Recomendado: .ico o PNG 32×32 px. Los cambios se aplican al recargar la página.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              value={branding.faviconUrl}
              onChange={(e) => setBranding((prev) => ({ ...prev, faviconUrl: e.target.value }))}
              placeholder="https://... o sube un .ico / .png"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => faviconRef.current?.click()}
              disabled={uploadingBrand === "favicon"}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {uploadingBrand === "favicon" ? (
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                  Subir
                </>
              )}
            </button>
            {branding.faviconUrl && (
              <button
                type="button"
                onClick={() => setBranding((prev) => ({ ...prev, faviconUrl: "" }))}
                className="px-3 py-2.5 border border-red-100 text-red-400 rounded-xl hover:bg-red-50 transition-colors"
                title="Eliminar favicon"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            )}
          </div>

          {branding.faviconUrl && (
            <div className="mt-4 bg-[#faf9f6] border border-gray-100 rounded-xl px-5 py-4 inline-flex items-center gap-3">
              <Image
                src={branding.faviconUrl}
                alt="Favicon preview"
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
                sizes="32px"
              />
              <span className="text-[11px] text-gray-400">Vista previa del favicon</span>
            </div>
          )}
        </div>

        {/* Brand Color */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1f1030, #33172c)" }}
            >
              <span className="material-symbols-outlined text-[18px] text-white">palette</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Color de Marca</h2>
              <p className="text-[11px] text-gray-400">
                Se usa para la pantalla de carga en dispositivos móviles y otros elementos de identidad.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={branding.brandColor || "#f5edf8"}
              onChange={(e) => setBranding((prev) => ({ ...prev, brandColor: e.target.value }))}
              className="w-12 h-12 rounded-xl border-none cursor-pointer bg-transparent"
            />
            <input
              value={branding.brandColor || "#f5edf8"}
              onChange={(e) => setBranding((prev) => ({ ...prev, brandColor: e.target.value }))}
              placeholder="#f5edf8"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none transition-all uppercase"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2 pb-10">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: saving ? "#6b7280" : "linear-gradient(135deg, #1f1030, #33172c)" }}
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                Guardar Identidad
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
