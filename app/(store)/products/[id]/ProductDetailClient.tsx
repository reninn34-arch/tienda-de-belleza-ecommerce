"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { Product } from "@/lib/types";

const SWATCHES = [
  { color: "#33172c", label: "Ciruela Medianoche" },
  { color: "#4a1c1c", label: "Borgoña Oscuro" },
  { color: "#1c2e4a", label: "Zafiro Ahumado" },
  { color: "#2c4a1c", label: "Musgo Botánico" },
];


const REVIEWS = [
  {
    title: '"Magia Pura en un Frasco"',
    text: '"He probado todos los tonos ciruela del mercado, pero este es incomparable. La profundidad del color es increíble y mi cabello se siente más sano después de usarlo que antes."',
    author: "Elena R.",
    stars: 5,
  },
  {
    title: '"El Brillo es Irreal"',
    text: '"Normalmente mi cabello se ve apagado después de teñir. Con Alquimia, parece que acabo de salir de un salón de lujo cada día. La calidad reflectante es simplemente impresionante."',
    author: "Marcus T.",
    stars: 5,
  },
  {
    title: '"Un Ritual que Vale la Pena"',
    text: '"La aplicación fue suave y el aroma es divino. No huele a químicos, sino a tratamiento de spa. Solo le quito media estrella porque ojalá el frasco fuera más grande."',
    author: "Sofía K.",
    stars: 4.5,
  },
];


const BADGE_MAP: Record<string, string> = {
  "Top Rated": "Más Valorado",
  "Pro Kit": "Kit Pro",
};

interface Props {
  product: Product;
  relatedProducts: Product[];
}

export default function ProductDetailClient({ product, relatedProducts }: Props) {
  const { addToCart } = useCart();
  const [selectedSwatch, setSelectedSwatch] = useState(0);
  const [subscribeMode, setSubscribeMode] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const allImages = product.gallery?.length ? product.gallery : [product.image];
  const [activeImage, setActiveImage] = useState(0);

  const displayPrice = subscribeMode ? product.price * 0.85 : product.price;
  const bundleTotal = [product, ...relatedProducts].reduce((s, p) => s + p.price, 0);

  useEffect(() => {
    const onScroll = () => setCtaVisible(window.scrollY > 800);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isOutOfStock = product.stock !== undefined && Number(product.stock) <= 0;

  const handleAdd = (qty = 1) => {
    if (isOutOfStock) return;
    addToCart(product, qty);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const addBundle = () => {
    addToCart(product, 1);
    relatedProducts.forEach((p) => addToCart(p, 1));
  };

  return (
    <>
      {/* ── Floating CTA ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-outline-variant p-4 md:px-8 lg:px-12 flex items-center justify-between shadow-2xl transition-transform duration-300 ${
          ctaVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="hidden md:flex items-center gap-4">
          <img alt={product.name} className="w-12 h-12 object-cover rounded" src={product.image} />
          <div>
            <p className="font-headline font-bold text-primary text-sm">{product.name}</p>
            <p className="text-secondary font-bold text-sm">${product.price.toFixed(2)}</p>
          </div>
        </div>
        <button
          onClick={() => handleAdd()}
          disabled={isOutOfStock}
          className={`flex-1 md:flex-none h-12 px-12 font-label font-bold uppercase tracking-widest rounded-md transition-all ${
            isOutOfStock
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-primary text-white hover:opacity-90'
          }`}
        >
          {isOutOfStock ? 'Agotado' : isAdded ? '¡Agregado!' : 'Agregar al Tocador'}
        </button>
      </div>

      {/* ── Hero ── */}
      <section className="relative h-[90vh] min-h-[700px] w-full overflow-hidden">
        <div className="absolute inset-0">
          <img alt={product.name} className="h-full w-full object-cover" src={product.image} />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/60 via-transparent to-transparent" />
        </div>
        <div className="relative z-10 h-full max-w-[1440px] mx-auto px-8 lg:px-12 flex flex-col justify-center pt-24">
          <div className="max-w-2xl text-white">
            <nav className="mb-6 flex items-center gap-2 text-xs uppercase tracking-widest text-white/70 font-label">
              <Link className="hover:text-white transition-colors" href="/collections">
                Colecciones
              </Link>
              <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              <span className="font-bold">{product.category.replace(/-/g, " ")}</span>
            </nav>

            {product.badge && (
              <span className="text-secondary-container font-label text-sm font-bold tracking-[0.3em] uppercase mb-4 block">
                {BADGE_MAP[product.badge] ?? product.badge}
              </span>
            )}

            <h1 className="text-6xl md:text-8xl font-headline mb-6 leading-tight italic">
              {product.name}
            </h1>
            <p className="text-xl md:text-2xl font-body mb-10 opacity-90 leading-relaxed max-w-lg">
              {product.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="text-3xl font-body font-light">${product.price.toFixed(2)}</div>
              <button
                onClick={() => handleAdd()}
                disabled={isOutOfStock}
                className={`group relative px-12 h-16 font-label font-bold uppercase tracking-widest rounded-md overflow-hidden transition-all active:scale-95 ${
                  isOutOfStock
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white text-primary hover:pr-16'
                }`}
              >
                <span className="relative z-10">{isOutOfStock ? 'Agotado' : isAdded ? '¡Agregado!' : 'Agregar al Tocador'}</span>
                {!isOutOfStock && (
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 material-symbols-outlined opacity-0 group-hover:opacity-100 transition-all">
                    east
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Por qué lo Amarás ── */}
      {product.highlights?.length ? (
        <section className="py-24 bg-surface-container-lowest border-y border-outline-variant/20">
          <div className="max-w-[1440px] mx-auto px-8 lg:px-12 text-center mb-16">
            <span className="text-secondary font-label text-xs font-bold tracking-[0.3em] uppercase mb-4 block">
              {product.highlightsLabel ?? "La Ventaja Alquímica"}
            </span>
            <h2 className="text-4xl font-headline text-primary italic">{product.highlightsTitle ?? "Por qué lo Amarás"}</h2>
          </div>
          <div className="max-w-[1200px] mx-auto px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {product.highlights.map((f) => (
              <div key={f.icon} className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 mb-6 rounded-full bg-surface-container flex items-center justify-center transition-colors group-hover:bg-secondary/10">
                  <span className="material-symbols-outlined text-secondary text-3xl">{f.icon}</span>
                </div>
                <h3 className="font-headline text-lg mb-3">{f.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Personalización ── */}
      <section className="py-16 md:py-32 max-w-[1440px] mx-auto px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Image gallery */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Main image */}
          <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-container-low group">
            <img
              alt={product.name}
              className="h-full w-full object-cover transition-all duration-500"
              src={allImages[activeImage]}
            />
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImage((prev) => (prev - 1 + allImages.length) % allImages.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-primary text-[18px]">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImage((prev) => (prev + 1) % allImages.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-primary text-[18px]">chevron_right</span>
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {allImages.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveImage(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImage ? "bg-white scale-125" : "bg-white/50"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {allImages.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    i === activeImage ? "border-primary" : "border-transparent opacity-60 hover:opacity-90"
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Options panel */}
        <div className="lg:col-span-5 flex flex-col gap-10">
          <div>
            <span className="text-secondary font-label text-sm font-bold tracking-[0.2em] uppercase mb-4 block">
              Elige tu Tono
            </span>

            {/* Color swatches */}
            <div className="flex flex-wrap gap-4 mb-8">
              {(product.swatches?.length ? product.swatches : SWATCHES).map((s, i) => (
                <button
                  key={s.color}
                  title={s.label}
                  onClick={() => setSelectedSwatch(i)}
                  className={`relative w-12 h-12 rounded-full transition-all transform hover:scale-110 ${
                    selectedSwatch === i
                      ? "ring-2 ring-secondary ring-offset-4 ring-offset-background"
                      : "border border-outline-variant"
                  }`}
                  style={{ backgroundColor: s.color }}
                >
                  <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_10px_rgba(255,255,255,0.15)]" />
                </button>
              ))}
            </div>

            {/* Subscription toggle */}
            <div className="bg-surface-container-low p-6 rounded-lg mb-8 border border-outline-variant/30">
              <label className="flex items-start gap-4 cursor-pointer mb-4">
                <input
                  type="radio"
                  name="purchase_type"
                  className="mt-1 text-primary focus:ring-primary"
                  checked={!subscribeMode}
                  onChange={() => setSubscribeMode(false)}
                />
                <div>
                  <span className="block font-bold text-primary">Compra única</span>
                  <span className="text-sm text-on-surface-variant">${product.price.toFixed(2)}</span>
                </div>
              </label>
              <div className="h-px bg-outline-variant/20 my-4" />
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="radio"
                  name="purchase_type"
                  className="mt-1 text-primary focus:ring-primary"
                  checked={subscribeMode}
                  onChange={() => setSubscribeMode(true)}
                />
                <div>
                  <span className="block font-bold text-primary">Suscríbete y Ahorra 15%</span>
                  <span className="text-sm text-secondary font-bold">
                    ${(product.price * 0.85).toFixed(2)}
                  </span>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Entregado cada 4 semanas. Cancela cuando quieras.
                  </p>
                </div>
              </label>
            </div>

            {/* Add to cart */}
            <div className="flex flex-col gap-4">
              {isOutOfStock ? (
                <div className="w-full h-16 bg-gray-200 text-gray-500 font-label font-bold uppercase tracking-widest rounded-md flex items-center justify-center text-[11px]">
                  Agotado
                </div>
              ) : (
                <button
                  onClick={() => handleAdd()}
                  className="w-full h-16 bg-primary text-white font-label font-bold uppercase tracking-widest rounded-md editorial-shadow hover:opacity-95 active:scale-[0.98] transition-all"
                >
                  {isAdded
                    ? "¡Agregado al Tocador!"
                    : `Agregar al Tocador — $${displayPrice.toFixed(2)}`}
                </button>
              )}
              {isOutOfStock && (
                <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center">
                  Este producto se encuentra agotado por el momento.
                </p>
              )}
              <p className="text-[10px] uppercase tracking-widest text-center text-on-surface-variant">
                Envío gratuito en pedidos mayores a $75
              </p>
            </div>
          </div>

          {/* Key features list */}
          {product.features && product.features.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary mb-4 block">
                Beneficios Clave
              </span>
              <ul className="space-y-2">
                {product.features.map((feat, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-sm text-on-surface-variant font-medium"
                  >
                    <span className="material-symbols-outlined text-secondary text-base">check</span>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Accordion */}
          <div className="space-y-0 border-t border-surface-variant/30 pt-8">
            {[
              { key: "details", label: "Detalles e Ingredientes", content: product.details },
              { key: "howToUse", label: "Cómo Usar", content: product.howToUse },
              { key: "shippingInfo", label: "Envíos y Devoluciones", content: product.shippingInfo },
            ].map(({ key, label, content }) => (
              <div key={key} className="border-b border-surface-variant/20 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenAccordion(openAccordion === key ? null : key)}
                  className="w-full flex items-center justify-between py-5 hover:text-secondary transition-colors text-primary"
                >
                  <span className="text-xs uppercase tracking-[0.15em] font-bold">{label}</span>
                  <span className={`material-symbols-outlined transition-transform duration-200 ${openAccordion === key ? "rotate-45" : ""}`}>add</span>
                </button>
                {openAccordion === key && content && (
                  <p className="pb-5 text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                    {content}
                  </p>
                )}
                {openAccordion === key && !content && (
                  <p className="pb-5 text-sm text-on-surface-variant/50 italic">Sin información disponible.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Perfectos Juntos ── */}
      {relatedProducts.length >= 2 && (
        <section className="py-14 md:py-24 bg-surface-container">
          <div className="max-w-[1440px] mx-auto px-8 lg:px-12">
            <h2 className="text-3xl font-headline text-primary mb-12 italic">Perfectos Juntos</h2>
            <div className="bg-white p-8 rounded-2xl shadow-sm flex flex-col md:flex-row items-center gap-12">
              {/* Product images */}
              <div className="flex items-center gap-4 overflow-x-auto pb-4 md:pb-0 flex-shrink-0">
                <img
                  alt={product.name}
                  className="w-24 h-24 object-cover rounded-lg"
                  src={product.image}
                />
                {relatedProducts.slice(0, 2).map((rp) => (
                  <div key={rp.id} className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-slate-300">add</span>
                    <img
                      alt={rp.name}
                      className="w-24 h-24 object-cover rounded-lg"
                      src={rp.image}
                    />
                  </div>
                ))}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4">
                <h3 className="text-xl font-headline">El Ritual Alquímico Completo</h3>
                <p className="text-on-surface-variant text-sm">
                  Ahorra 15% al adquirir el sistema completo de 3 pasos para la preservación del color
                  e hidratación profunda.
                </p>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-primary">
                    ${(bundleTotal * 0.85).toFixed(2)}
                  </span>
                  <span className="text-on-surface-variant line-through text-sm">
                    ${bundleTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={addBundle}
                className="whitespace-nowrap px-8 py-4 bg-secondary text-white font-label font-bold uppercase tracking-widest rounded hover:bg-secondary/90 transition-all"
              >
                Agregar Kit al Tocador
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── La Ciencia del Tono ── */}
      {(product.scienceTitle || product.scienceDesc || product.scienceItems?.length) ? (
        <section className="py-16 md:py-32">
          <div className="max-w-[1440px] mx-auto px-8 lg:px-12">
            <div className="flex flex-col lg:flex-row gap-24 items-center">
              <div className="lg:w-1/2">
                <h2 className="text-3xl md:text-5xl font-headline text-primary mb-8 italic leading-tight">
                  {product.scienceTitle}
                </h2>
                <p className="text-on-surface-variant leading-relaxed text-lg mb-10">
                  {product.scienceDesc}
                </p>
                {product.scienceItems?.length ? (
                  <div className="space-y-8">
                    {product.scienceItems.map((item, i) => (
                      <div key={i} className="flex gap-6">
                        <div className="w-12 h-12 flex-shrink-0 bg-primary/5 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-secondary">{item.icon}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-primary mb-2">{item.title}</h4>
                          <p className="text-on-surface-variant">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="lg:w-1/2 rounded-2xl overflow-hidden shadow-2xl">
                <img alt="Proceso Alquímico" className="w-full h-full object-cover" src={product.gallery?.[2] ?? product.image} />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Reseñas ── */}
      <section className="py-16 md:py-32 bg-background border-t border-outline-variant/30">
        <div className="max-w-[1440px] mx-auto px-8 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div>
              <span className="text-secondary font-label text-xs font-bold tracking-[0.3em] uppercase mb-4 block">
                El Círculo Alquimista
              </span>
              <h2 className="text-4xl font-headline text-primary italic">
                Reflexiones de la Comunidad
              </h2>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex text-secondary">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <span className="text-sm font-bold text-primary">4.9 / 5.0</span>
                <span className="text-sm text-on-surface-variant">(1,284 Reseñas)</span>
              </div>
            </div>
            <button className="px-8 py-3 border border-primary text-primary font-label text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
              Escribir Reseña
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(product.reviews?.length ? product.reviews : REVIEWS).map((r, i) => (
              <div
                key={i}
                className="bg-surface-container-lowest p-8 rounded-xl editorial-shadow border border-outline-variant/10"
              >
                <div className="flex text-secondary mb-4 scale-90 -ml-2">
                  {[...Array(5)].map((_, si) => {
                    const fill =
                      si < Math.floor(r.stars)
                        ? 1
                        : r.stars % 1 > 0 && si === Math.floor(r.stars)
                        ? 0.5
                        : 0;
                    return (
                      <span
                        key={si}
                        className="material-symbols-outlined text-[18px]"
                        style={{ fontVariationSettings: `'FILL' ${fill}` }}
                      >
                        star
                      </span>
                    );
                  })}
                </div>
                <p className="font-headline text-lg text-primary mb-4">{r.title}</p>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">{r.text}</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-container-high" />
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">
                      {r.author}
                    </p>
                    <p className="text-[10px] text-secondary font-label uppercase">
                      Visionario/a Verificado/a
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
