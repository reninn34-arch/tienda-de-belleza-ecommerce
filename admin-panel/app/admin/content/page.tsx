"use client";

import { useEffect, useRef, useState } from "react";
import LinkPicker from "@/components/LinkPicker";

interface VentajaItem { icon: string; title: string; desc: string; }
interface FooterLink { label: string; href: string; }
interface FooterColumn { title: string; links: FooterLink[]; }
interface FooterSettings {
  brandName: string;
  brandDesc: string;
  copyright: string;
  tagline: string;
  columns: FooterColumn[];
}
function emptyFooterLink(): FooterLink { return { label: "", href: "/" }; }
function emptyFooterColumn(): FooterColumn { return { title: "", links: [] }; }

interface Slide {
  id: string;
  image: string;
  label: string;
  title: string;
  titleHighlight: string;
  description: string;
  cta1Text: string;
  cta1Link: string;
  cta2Text: string;
  cta2Link: string;
}

interface ContentSettings {
  hero: { title: string; subtitle: string; description: string; ctaText: string; ctaLink: string };
  announcement: { enabled: boolean; text: string; link: string };
  featuredSection: { title: string; subtitle: string };
  slides: Slide[];
  home: {
    ventaja: { label: string; title: string; items: VentajaItem[] };
    newsletter: { enabled: boolean; label: string; title: string; description: string; formType: "email" | "contact"; buttonText: string };
  };
}

function emptySlide(): Slide {
  return {
    id: `slide-${Date.now()}`,
    image: "",
    label: "",
    title: "",
    titleHighlight: "",
    description: "",
    cta1Text: "",
    cta1Link: "/products",
    cta2Text: "",
    cta2Link: "/collections",
  };
}

interface Branding {
  logoUrl: string;
  faviconUrl: string;
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

export default function AdminContentPage() {
  const [content, setContent] = useState<ContentSettings | null>(null);
  const [branding, setBranding] = useState<Branding>({ logoUrl: "", faviconUrl: "" });
  const [socialLinks, setSocialLinks] = useState({ instagram: "", tiktok: "", facebook: "", whatsapp: "" });
  const [footer, setFooterState] = useState<FooterSettings>({
    brandName: "", brandDesc: "", copyright: "", tagline: "", columns: [],
  });
  const [storeName, setStoreName] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState<number | null>(null);
  const [uploadingBrand, setUploadingBrand] = useState<"logo" | "favicon" | null>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((s) => {
        setStoreName(s.storeName ?? "The Editorial Alchemist");
        setContent({
          ...s.content,
          slides: s.content?.slides ?? [],
          home: {
            ...s.content?.home,
            ventaja: s.content?.home?.ventaja ?? { label: "La Ventaja Alquímica", title: "Por qué lo Amarás", items: [] },
            newsletter: s.content?.home?.newsletter ?? {
              enabled: true, label: "El Círculo Íntimo", title: "Únete a la Sociedad.",
              description: "", formType: "email", buttonText: "Suscribirse",
            },
          },
        });
        setBranding(s.branding ?? { logoUrl: "", faviconUrl: "" });
        setSocialLinks(s.socialLinks ?? { instagram: "", tiktok: "", facebook: "", whatsapp: "" });
        const rawFooter = s.footer ?? {};
        // migrate legacy col1/col2 format
        const columns: FooterColumn[] = rawFooter.columns ?? [
          { title: rawFooter.col1Title ?? "La Marca", links: rawFooter.col1Links ?? [] },
          { title: rawFooter.col2Title ?? "Soporte", links: rawFooter.col2Links ?? [] },
        ];
        setFooterState({
          brandName: rawFooter.brandName ?? "The Editorial Alchemist",
          brandDesc: rawFooter.brandDesc ?? "Creando un mundo de belleza transformadora y arte consciente a través de la precisión científica.",
          copyright: rawFooter.copyright ?? "The Editorial Alchemist. Pigmento Puro. Arte Absoluto.",
          tagline: rawFooter.tagline ?? "Creado para el Alquimista en ti.",
          columns,
        });
      });
  }, []);

  function setHero(key: keyof ContentSettings["hero"], value: string) {
    setContent((prev) => prev ? { ...prev, hero: { ...prev.hero, [key]: value } } : prev);
  }

  function setAnnouncement(key: keyof ContentSettings["announcement"], value: string | boolean) {
    setContent((prev) => prev ? { ...prev, announcement: { ...prev.announcement, [key]: value } } : prev);
  }

  function setFeatured(key: keyof ContentSettings["featuredSection"], value: string) {
    setContent((prev) => prev ? { ...prev, featuredSection: { ...prev.featuredSection, [key]: value } } : prev);
  }

  function setVentajaMeta(key: "label" | "title", value: string) {
    setContent((prev) => prev ? { ...prev, home: { ...prev.home, ventaja: { ...prev.home.ventaja, [key]: value } } } : prev);
  }

  function setVentajaItem(i: number, field: keyof VentajaItem, value: string) {
    setContent((prev) => {
      if (!prev) return prev;
      const items = [...prev.home.ventaja.items];
      items[i] = { ...items[i], [field]: value };
      return { ...prev, home: { ...prev.home, ventaja: { ...prev.home.ventaja, items } } };
    });
  }

  function addVentajaItem() {
    setContent((prev) => {
      if (!prev) return prev;
      const items = [...prev.home.ventaja.items, { icon: "star", title: "", desc: "" }];
      return { ...prev, home: { ...prev.home, ventaja: { ...prev.home.ventaja, items } } };
    });
  }

  function setFooter<K extends keyof FooterSettings>(key: K, value: FooterSettings[K]) {
    setFooterState((prev) => ({ ...prev, [key]: value }));
  }

  function setColumnTitle(colIdx: number, title: string) {
    setFooterState((prev) => {
      const columns = [...prev.columns];
      columns[colIdx] = { ...columns[colIdx], title };
      return { ...prev, columns };
    });
  }

  function addColumn() {
    setFooterState((prev) => ({ ...prev, columns: [...prev.columns, emptyFooterColumn()] }));
  }

  function removeColumn(colIdx: number) {
    setFooterState((prev) => ({ ...prev, columns: prev.columns.filter((_, i) => i !== colIdx) }));
  }

  function addFooterLink(colIdx: number) {
    setFooterState((prev) => {
      const columns = [...prev.columns];
      columns[colIdx] = { ...columns[colIdx], links: [...columns[colIdx].links, emptyFooterLink()] };
      return { ...prev, columns };
    });
  }

  function setFooterLink(colIdx: number, linkIdx: number, field: keyof FooterLink, value: string) {
    setFooterState((prev) => {
      const columns = [...prev.columns];
      const links = [...columns[colIdx].links];
      links[linkIdx] = { ...links[linkIdx], [field]: value };
      columns[colIdx] = { ...columns[colIdx], links };
      return { ...prev, columns };
    });
  }

  function removeFooterLink(colIdx: number, linkIdx: number) {
    setFooterState((prev) => {
      const columns = [...prev.columns];
      columns[colIdx] = { ...columns[colIdx], links: columns[colIdx].links.filter((_, i) => i !== linkIdx) };
      return { ...prev, columns };
    });
  }

  function removeVentajaItem(i: number) {
    setContent((prev) => {
      if (!prev) return prev;
      const items = prev.home.ventaja.items.filter((_, j) => j !== i);
      return { ...prev, home: { ...prev.home, ventaja: { ...prev.home.ventaja, items } } };
    });
  }

  function updateSlide(idx: number, key: keyof Slide, value: string) {
    setContent((prev) => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      slides[idx] = { ...slides[idx], [key]: value };
      return { ...prev, slides };
    });
  }

  function addSlide() {
    setContent((prev) => {
      if (!prev) return prev;
      return { ...prev, slides: [...prev.slides, emptySlide()] };
    });
  }

  function removeSlide(idx: number) {
    setContent((prev) => {
      if (!prev) return prev;
      return { ...prev, slides: prev.slides.filter((_, i) => i !== idx) };
    });
  }

  function moveSlide(idx: number, dir: -1 | 1) {
    setContent((prev) => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      const target = idx + dir;
      if (target < 0 || target >= slides.length) return prev;
      [slides[idx], slides[target]] = [slides[target], slides[idx]];
      return { ...prev, slides };
    });
  }

  async function uploadImage(idx: number, file: File) {
    setUploadingIdx(idx);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await res.json();
    if (data.url) updateSlide(idx, "image", data.url);
    setUploadingIdx(null);
  }

  async function uploadBrandAsset(key: "logo" | "favicon", file: File) {
    setUploadingBrand(key);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await res.json();
    if (data.url) setBranding((prev) => ({ ...prev, [key === "logo" ? "logoUrl" : "faviconUrl"]: data.url }));
    setUploadingBrand(null);
  }

  async function handleSave() {
    if (!content) return;
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeName, content, branding, socialLinks, footer }),
    });
    setSaving(false);
    setToast("Contenido guardado correctamente.");
    setTimeout(() => setToast(""), 3000);
  }

  if (!content) {
    return <div className="p-8 flex justify-center"><span className="w-7 h-7 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" /></div>;
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
        <h1 className="text-2xl font-bold text-gray-900">Carrusel y Textos</h1>
        <p className="text-sm text-gray-400 mt-1">Edita el carrusel principal y los textos de la tienda.</p>
      </div>

      <div className="space-y-6">
        {/* Identidad de Marca */}
        <input type="file" accept="image/*" ref={logoRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBrandAsset("logo", f); }} />
        <input type="file" accept="image/*,.ico" ref={faviconRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBrandAsset("favicon", f); }} />

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Identidad de Marca</h2>
          <p className="text-[11px] text-gray-400 mb-5">Logo que reemplaza el nombre de texto en el header. Favicon que aparece en la pestaña del navegador.</p>
          <div className="space-y-5">
            {/* Store name */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Nombre de la Tienda</label>
              <input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="The Editorial Alchemist"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">Aparece en el login del admin y en el panel.</p>
            </div>
            {/* Logo */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Logo de la Tienda</label>
              <div className="flex gap-2">
                <input
                  value={branding.logoUrl}
                  onChange={(e) => setBranding((prev) => ({ ...prev, logoUrl: e.target.value }))}
                  placeholder="https://... o sube una imagen"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                />
                <button
                  onClick={() => logoRef.current?.click()}
                  disabled={uploadingBrand === "logo"}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {uploadingBrand === "logo" ? (
                    <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                  )}
                </button>
                {branding.logoUrl && (
                  <button
                    onClick={() => setBranding((prev) => ({ ...prev, logoUrl: "" }))}
                    className="px-3 py-2.5 border border-red-100 text-red-400 rounded-xl hover:bg-red-50 transition-colors"
                    title="Eliminar logo"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                )}
              </div>
              {branding.logoUrl && (
                <div className="mt-3 bg-[#faf9f6] border border-gray-100 rounded-xl px-4 py-3 inline-flex items-center">
                  <img src={branding.logoUrl} alt="Logo preview" className="h-10 max-w-[200px] object-contain" />
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1.5">Recomendado: PNG transparente, altura ~40px. Si está vacío se muestra el nombre de texto.</p>
            </div>

            {/* Favicon */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Favicon (ícono de pestaña)</label>
              <div className="flex gap-2">
                <input
                  value={branding.faviconUrl}
                  onChange={(e) => setBranding((prev) => ({ ...prev, faviconUrl: e.target.value }))}
                  placeholder="https://... o sube un .ico / .png"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                />
                <button
                  onClick={() => faviconRef.current?.click()}
                  disabled={uploadingBrand === "favicon"}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {uploadingBrand === "favicon" ? (
                    <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                  )}
                </button>
                {branding.faviconUrl && (
                  <button
                    onClick={() => setBranding((prev) => ({ ...prev, faviconUrl: "" }))}
                    className="px-3 py-2.5 border border-red-100 text-red-400 rounded-xl hover:bg-red-50 transition-colors"
                    title="Eliminar favicon"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                )}
              </div>
              {branding.faviconUrl && (
                <div className="mt-3 bg-[#faf9f6] border border-gray-100 rounded-xl px-4 py-3 inline-flex items-center gap-3">
                  <img src={branding.faviconUrl} alt="Favicon preview" className="w-8 h-8 object-contain" />
                  <span className="text-[11px] text-gray-400">Vista previa del favicon</span>
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1.5">Recomendado: .ico o PNG 32×32px. Los cambios se aplican al recargar la página.</p>
            </div>
          </div>
        </div>

        {/* Redes Sociales */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Redes Sociales</h2>
          <div className="space-y-4">
            {(["instagram", "tiktok", "facebook", "whatsapp"] as const).map((net) => {
              const icons: Record<string, string> = {
                instagram: "📷",
                tiktok: "🎵",
                facebook: "📘",
                whatsapp: "💬",
              };
              const labels: Record<string, string> = {
                instagram: "Instagram (URL del perfil)",
                tiktok: "TikTok (URL del perfil)",
                facebook: "Facebook (URL del perfil)",
                whatsapp: "WhatsApp (número con código de país, ej: 521234567890)",
              };
              return (
                <div key={net}>
                  <label className="block text-[11px] text-gray-500 mb-1 font-medium">
                    {icons[net]} {labels[net]}
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33172c]/20"
                    value={socialLinks[net]}
                    onChange={(e) => setSocialLinks((prev) => ({ ...prev, [net]: e.target.value }))}
                    placeholder={net === "whatsapp" ? "521234567890" : `https://${net}.com/tuperfil`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Announcement Bar */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Barra de Anuncio</h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={content.announcement.enabled}
                onChange={(e) => setAnnouncement("enabled", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#33172c] transition-colors after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Texto del anuncio</label>
              <input
                value={content.announcement.text}
                onChange={(e) => setAnnouncement("text", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Enlace</label>
              <input
                value={content.announcement.link}
                onChange={(e) => setAnnouncement("link", e.target.value)}
                placeholder="/products"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Sección Hero (Página Principal)</h2>
          <p className="text-[11px] text-gray-400 mb-4">Texto de respaldo si no hay slides en el carrusel.</p>
          <div className="space-y-4">
            {[
              { key: "title" as const, label: "Título Principal", placeholder: "El Ritual de Color" },
              { key: "subtitle" as const, label: "Subtítulo", placeholder: "Para la Mujer Que Sabe" },
              { key: "description" as const, label: "Descripción", placeholder: "Tratamientos de color profesional..." },
              { key: "ctaText" as const, label: "Texto del botón CTA", placeholder: "Explorar la Colección" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{label}</label>
                <input
                  value={content.hero[key]}
                  onChange={(e) => setHero(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                />
              </div>
            ))}
            <LinkPicker
              label="Enlace del botón CTA"
              value={content.hero.ctaLink}
              onChange={(url) => setHero("ctaLink", url)}
            />
          </div>
        </div>

        {/* Hero Carousel Slides */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Carrusel Principal</h2>
              <p className="text-[11px] text-gray-400 mt-1">Los slides se muestran en la sección hero de la tienda.</p>
            </div>
            <button
              onClick={addSlide}
              className="flex items-center gap-1.5 text-xs font-bold text-[#33172c] border border-[#33172c]/30 rounded-xl px-4 py-2 hover:bg-[#33172c]/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Agregar Slide
            </button>
          </div>

          {content.slides.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              No hay slides. Haz clic en &ldquo;Agregar Slide&rdquo; para crear el primero.
            </p>
          )}

          <div className="space-y-6">
            {content.slides.map((slide, idx) => (
              <div key={slide.id} className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50 space-y-4">
                {/* Slide header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Slide {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveSlide(idx, -1)}
                      disabled={idx === 0}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                    </button>
                    <button
                      onClick={() => moveSlide(idx, 1)}
                      disabled={idx === content.slides.length - 1}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                    </button>
                    <button
                      onClick={() => removeSlide(idx)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Image */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Imagen de Fondo</label>
                  <div className="flex gap-2">
                    <input
                      value={slide.image}
                      onChange={(e) => updateSlide(idx, "image", e.target.value)}
                      placeholder="https://... o sube una imagen"
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => { fileRefs.current[idx] = el; }}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImage(idx, file);
                      }}
                    />
                    <button
                      onClick={() => fileRefs.current[idx]?.click()}
                      disabled={uploadingIdx === idx}
                      className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {uploadingIdx === idx ? (
                        <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">upload</span>
                      )}
                    </button>
                  </div>
                  {slide.image && (
                    <img src={slide.image} alt="preview" className="mt-2 h-24 w-full object-cover rounded-xl" />
                  )}
                </div>

                {/* Label */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Etiqueta (texto pequeño arriba del título)</label>
                  <input
                    value={slide.label}
                    onChange={(e) => updateSlide(idx, "label", e.target.value)}
                    placeholder="Arte Científico • Excelencia Editorial"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                  />
                </div>

                {/* Title + Highlight */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Título</label>
                    <input
                      value={slide.title}
                      onChange={(e) => updateSlide(idx, "title", e.target.value)}
                      placeholder="El Maestro del"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Título en itálica</label>
                    <input
                      value={slide.titleHighlight}
                      onChange={(e) => updateSlide(idx, "titleHighlight", e.target.value)}
                      placeholder="Pigmento Puro"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none italic"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Descripción</label>
                  <textarea
                    value={slide.description}
                    onChange={(e) => updateSlide(idx, "description", e.target.value)}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none resize-none"
                  />
                </div>

                {/* CTAs */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Botón 1 · Texto</label>
                    <input
                      value={slide.cta1Text}
                      onChange={(e) => updateSlide(idx, "cta1Text", e.target.value)}
                      placeholder="Comprar la Colección"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                    />
                    <LinkPicker
                      label="Botón 1 · Enlace"
                      value={slide.cta1Link}
                      onChange={(url) => updateSlide(idx, "cta1Link", url)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Botón 2 · Texto</label>
                    <input
                      value={slide.cta2Text}
                      onChange={(e) => updateSlide(idx, "cta2Text", e.target.value)}
                      placeholder="Ver Lookbook"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                    />
                    <LinkPicker
                      label="Botón 2 · Enlace"
                      value={slide.cta2Link}
                      onChange={(url) => updateSlide(idx, "cta2Link", url)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Section */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Sección Destacados</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Título</label>
              <input value={content.featuredSection.title} onChange={(e) => setFeatured("title", e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Subtítulo</label>
              <input value={content.featuredSection.subtitle} onChange={(e) => setFeatured("subtitle", e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
            </div>
          </div>
        </div>

        {/* Ventaja Alquímica / Por qué lo Amarás */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">La Ventaja Alquímica</h2>
              <p className="text-[11px] text-gray-400 mt-1">Sección "Por qué lo Amarás" en la página de inicio.</p>
            </div>
            <button
              onClick={addVentajaItem}
              className="flex items-center gap-1.5 text-xs font-bold text-[#33172c] border border-[#33172c]/30 rounded-xl px-4 py-2 hover:bg-[#33172c]/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Agregar ventaja
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Etiqueta</label>
              <input
                value={content.home.ventaja.label}
                onChange={(e) => setVentajaMeta("label", e.target.value)}
                placeholder="La Ventaja Alquímica"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Título</label>
              <input
                value={content.home.ventaja.title}
                onChange={(e) => setVentajaMeta("title", e.target.value)}
                placeholder="Por qué lo Amarás"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
              />
            </div>
          </div>

          {content.home.ventaja.items.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              No hay ventajas. Haz clic en &ldquo;Agregar ventaja&rdquo; para crear la primera.
            </p>
          )}

          <div className="space-y-4">
            {content.home.ventaja.items.map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3 relative">
                <button
                  type="button"
                  onClick={() => removeVentajaItem(i)}
                  className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 text-red-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>

                <div className="grid grid-cols-2 gap-3 pr-8">
                  {/* Icon picker */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Ícono</label>
                    <button
                      type="button"
                      onClick={() => setIconPickerOpen(iconPickerOpen === i ? null : i)}
                      className="flex items-center gap-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#33172c]">{item.icon || "star"}</span>
                      <span className="text-gray-600 flex-1 text-left">{item.icon || "Elegir ícono"}</span>
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
                            onClick={() => { setVentajaItem(i, "icon", ic.icon); setIconPickerOpen(null); }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] transition-colors ${
                              item.icon === ic.icon
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
                  {/* Title */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Título</label>
                    <input
                      value={item.title}
                      onChange={(e) => setVentajaItem(i, "title", e.target.value)}
                      placeholder="Fórmula Científica"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#33172c]/20 outline-none"
                    />
                  </div>
                </div>
                {/* Description */}
                <textarea
                  value={item.desc}
                  onChange={(e) => setVentajaItem(i, "desc", e.target.value)}
                  placeholder="Describe esta ventaja..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#33172c]/20 outline-none resize-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">Pie de Página (Footer)</h2>

          {/* Brand */}
          <div className="space-y-3 mb-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Nombre de la marca</label>
              <input value={footer.brandName} onChange={(e) => setFooter("brandName", e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Descripción de la marca</label>
              <textarea value={footer.brandDesc} onChange={(e) => setFooter("brandDesc", e.target.value)} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Copyright (texto junto al año)</label>
                <input value={footer.copyright} onChange={(e) => setFooter("copyright", e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Tagline (derecha)</label>
                <input value={footer.tagline} onChange={(e) => setFooter("tagline", e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none" />
              </div>
            </div>
          </div>

          {/* Columnas dinámicas */}
          <div className="space-y-6">
            {footer.columns.map((col, colIdx) => (
              <div key={colIdx} className="border border-gray-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-3">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Título de columna</label>
                    <input
                      value={col.title}
                      onChange={(e) => setColumnTitle(colIdx, e.target.value)}
                      placeholder="La Marca"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                    />
                  </div>
                  <div className="flex items-end gap-2 pb-0.5">
                    <button onClick={() => addFooterLink(colIdx)} className="flex items-center gap-1 text-xs font-bold text-[#33172c] border border-[#33172c]/30 rounded-xl px-3 py-2 hover:bg-[#33172c]/5 transition-colors">
                      <span className="material-symbols-outlined text-[14px]">add</span> Enlace
                    </button>
                    <button onClick={() => removeColumn(colIdx)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-red-100 text-red-400 hover:bg-red-50 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {col.links.map((link, linkIdx) => (
                    <div key={linkIdx} className="border border-gray-100 rounded-xl p-3 space-y-2 relative">
                      <button onClick={() => removeFooterLink(colIdx, linkIdx)} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 text-red-400 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                      <div className="pr-8">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Etiqueta</label>
                        <input value={link.label} onChange={(e) => setFooterLink(colIdx, linkIdx, "label", e.target.value)} placeholder="Etiqueta" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#33172c]/20 outline-none" />
                      </div>
                      <LinkPicker label="Destino" value={link.href} onChange={(url) => setFooterLink(colIdx, linkIdx, "href", url)} scope="pages" />
                    </div>
                  ))}
                  {col.links.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">Sin enlaces. Haz clic en &ldquo;Enlace&rdquo; para agregar.</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addColumn}
            className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-[#33172c] border border-[#33172c]/30 border-dashed rounded-xl px-4 py-3 hover:bg-[#33172c]/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span> Agregar columna
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-[#33172c] text-white rounded-xl text-sm font-bold hover:bg-[#4b2c42] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          {saving ? "Guardando..." : "Guardar Contenido"}
        </button>
      </div>
    </div>
  );
}
