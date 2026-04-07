import Link from "next/link";
import Image from "next/image";
import ProductCarousel from "@/components/store/ProductCarousel";
import HeroCarousel from "@/components/store/HeroCarousel";
import NewsletterForm from "@/components/store/NewsletterForm";
import { getAllProducts, getSlides, getHomeContent, getCollectionsPage, getSocialLinks } from "@/lib/data";

export default async function Home() {
  const featured = (await getAllProducts()).slice(0, 4);
  const slides = await getSlides();
  const home = await getHomeContent();
  const collectionsPage = await getCollectionsPage();
  const collections = collectionsPage?.collections ?? [];
  const { whatsapp } = await getSocialLinks();

  const t = home?.tendencias;
  const tr = home?.transformacion;
  const sel = home?.seleccion;
  const nl = home?.newsletter;
  const v = home?.ventaja;

  return (
    <>
      {/* â”€â”€ Hero Carrusel â”€â”€ */}
      <HeroCarousel slides={slides} />

      {/* â”€â”€ Tendencias â”€â”€ */}
      <section className="py-16 md:py-32 bg-surface-container-lowest">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 md:mb-20">
            <div className="max-w-xl">
              <span className="font-label text-secondary uppercase tracking-[0.3em] text-[10px] font-bold mb-4 block">
                {t?.label ?? "Lo Esencial"}
              </span>
              <h2 className="font-headline text-4xl md:text-5xl text-primary">{t?.title ?? "Tendencias"}</h2>
              <p className="text-on-surface-variant font-light mt-4 text-base md:text-lg">
                {t?.description ?? ""}
              </p>
            </div>
            <Link
              className="group flex items-center gap-3 text-primary font-label text-xs uppercase tracking-widest border-b border-primary/20 pb-2 hover:border-primary transition-all mt-6 md:mt-0"
              href={t?.linkHref ?? "/products"}
            >
              {t?.linkText ?? "Ver Todos"}
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
          </div>
          <ProductCarousel products={featured} />
        </div>
      </section>

      {/* â”€â”€ Transformaciones & Testimonios â”€â”€ */}
      <section className="py-16 md:py-32 px-8 overflow-hidden bg-surface-container-low/30">
        <div className="max-w-[1440px] mx-auto">
          <div className="text-center mb-10 md:mb-24">
            <span className="font-label text-secondary uppercase tracking-[0.4em] text-[10px] font-bold mb-4 block">
              {tr?.label ?? "El Resultado del Alquimista"}
            </span>
            <h2 className="font-headline text-4xl md:text-5xl text-primary">{tr?.title ?? "TransformaciÃ³n Pura"}</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-20 items-center">
            {/* Antes / DespuÃ©s */}
            <div className="relative grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg shadow-lg">
                  <Image
                    alt="Antes"
                    src={tr?.beforeImage ?? "https://lh3.googleusercontent.com/aida-public/AB6AXuCpcWDWGgWOynQGcDLIlQ34QG6QNBZ1wNXtqL-iGsfFG1lHGCS0exS9LqjKAGjXUOj1BEKH6igTfnUVwmjdAqSh3kzVaIYiv_r3vC2cEyMRaTPBmZsHKqOeJhafwBQOLB_67g1rdIRUf78g-tTlpQZcVLCEIlY-ZTAJ76f8gdgaxIN58nLGiCkEXL1n52QH-o5EJwa4zyEhrEYe1OKQliK469Ur0qbwvshHIcjbG0q55goAVbP-51A3iGFdevbnGgW5F76VhBs_hRE"}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 25vw, 50vw"
                  />
                  <span className="absolute bottom-4 left-4 bg-black/60 text-white text-[8px] uppercase tracking-widest px-2 py-1 rounded">
                    Antes
                  </span>
                </div>
              </div>
              <div className="space-y-4 pt-12">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg shadow-2xl">
                  <Image
                    alt="DespuÃ©s"
                    src={tr?.afterImage ?? "https://lh3.googleusercontent.com/aida-public/AB6AXuBoPXafMaVEeaWVGngx9QNc2UOTiaZAobP_GHHeLF3zcJ9IONaHZfxyK2ctbLimWlxuIjwreWiidHJo4af_18vpj8CpYbkh2Rqu-ZePX8Uln9tVMPbSQTtxMCXBkV2K66JsdOx67nG_9dq1ymQFdXGPZtPRrV_VDo_X3nftNWxRWoMIo9bHIa0qizoLW4ukk5XJW6ILODmxmQYr0mo0PQRqYlCJ-Vn86ur6SDRVTFEkufUcHDuLpNfjbQ1u8NwU8QLXzjmfkR2Oc_c"}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 25vw, 50vw"
                  />
                  <span className="absolute bottom-4 left-4 bg-secondary text-white text-[8px] uppercase tracking-widest px-2 py-1 rounded font-bold">
                    {tr?.afterLabel ?? "DespuÃ©s"}
                  </span>
                </div>
              </div>
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-full bg-secondary-container/10 rounded-full blur-[100px]" />
            </div>

            {/* Testimonio */}
            <div className="space-y-8 md:space-y-12">
              <div className="relative">
                <span className="material-symbols-outlined text-6xl text-secondary/20 absolute -top-10 -left-6">
                  format_quote
                </span>
                <p className="font-headline text-3xl md:text-4xl text-primary leading-snug italic">
                  &ldquo;{tr?.quote ?? ""}&rdquo;
                </p>
                <div className="mt-8 flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <Image
                      alt={tr?.authorName ?? ""}
                      src={tr?.authorImage ?? "https://lh3.googleusercontent.com/aida-public/AB6AXuB7MXnNnmd1qzHzru38uSNZ2MeGoKnL1vcso0OcZ9T821b6hXZZ19fce-SFv-KQ1SdPKIqRYVt2dfUIvR2eFQlfJYa0q3VubVqysyYtQiTsiTFuGsYJc1EbKpmsDlac8WRx94LFL161WzVyk69Zq5ts4YXWv0LapmSmVRpksM5lR9EALZwz8KNF-zfBV74xXHABpMUSszZTBXFc6RJXRoWZ_THoIy0CczNAWkZbaRFZUTJ-NtyNsbf6m0scPl6BRA8-TNaFF5oEKz4"}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-primary text-sm uppercase tracking-widest">{tr?.authorName ?? ""}</p>
                    <p className="text-on-surface-variant text-[10px] uppercase tracking-[0.2em] font-light">
                      {tr?.authorRole ?? ""}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 md:gap-8 border-t border-primary/10 pt-8 md:pt-12">
                {(tr?.stats ?? [
                  { value: "98%", label: "Tasa de RetenciÃ³n" },
                  { value: "450k", label: "Tonos Mezclados" },
                  { value: "4.9/5", label: "CalificaciÃ³n" },
                ]).map((stat, i) => (
                  <div key={i}>
                    <p className="text-2xl md:text-4xl font-headline text-primary">{stat.value}</p>
                    <p className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant mt-2">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ Colecciones Editoriales (AsimÃ©tricas) â”€â”€ */}
      <section className="py-16 md:py-32 px-8 max-w-[1440px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-baseline mb-10 md:mb-24">
          <div className="max-w-xl">
            <span className="font-label text-secondary uppercase tracking-[0.3em] text-[10px] font-bold mb-4 block">
              {sel?.label ?? "EdiciÃ³n de Temporada"}
            </span>
            <h2 className="font-headline text-4xl md:text-5xl text-primary">{sel?.title ?? "La SelecciÃ³n de Invierno"}</h2>
          </div>
          <Link
            href={sel?.linkHref ?? "/collections"}
            className="mt-8 md:mt-0 text-primary border-b border-secondary/30 pb-2 font-label text-[10px] uppercase tracking-[0.2em] font-bold hover:border-secondary transition-all"
          >
            {sel?.linkText ?? "Explorar Colecciones"}
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Featured — first collection */}
          {collections[0] && (
            <div className="md:col-span-7 group cursor-pointer relative">
              <Link href={`/collections/${collections[0].id}`} className="block">
                <div className="relative aspect-[4/5] md:aspect-auto md:h-[700px] overflow-hidden rounded-lg">
                  <Image
                    className="object-cover group-hover:scale-105 transition-transform duration-[2000ms]"
                    alt={collections[0].title}
                    src={collections[0].image}
                    fill
                    sizes="(min-width: 1024px) 60vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                  <div className="absolute bottom-6 left-6 sm:bottom-12 sm:left-12 text-white z-10">
                    <span className="font-label text-[10px] uppercase tracking-[0.3em] font-bold opacity-80">
                      {collections[0].subtitle}
                    </span>
                    <h3 className="font-headline text-3xl sm:text-5xl mt-3">{collections[0].title}</h3>
                    <p className="mt-6 font-light max-w-xs text-white/90 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700">
                      {collections[0].description}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Secondary column — remaining collections */}
          {collections.length > 1 && (
            <div className={`${collections[0] ? "md:col-span-5" : "md:col-span-12"} flex flex-col gap-12`}>
              {collections.slice(1, 3).map((col) => (
                <div key={col.id} className="group cursor-pointer">
                  <Link href={`/collections/${col.id}`} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                      <Image
                        className="object-cover group-hover:scale-105 transition-transform duration-[2000ms]"
                        alt={col.title}
                        src={col.image}
                        fill
                        sizes="(min-width: 1024px) 35vw, 100vw"
                      />
                      <div className="absolute inset-0 bg-black/10" />
                      <div className="absolute inset-0 flex flex-col justify-end p-10 bg-gradient-to-t from-black/40 to-transparent">
                        <h3 className="font-headline text-3xl text-white">{col.title}</h3>
                        <span className="font-label text-[10px] text-white/70 uppercase tracking-widest mt-2">
                          {col.subtitle}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      {/* ── Ventaja Alquímica ── */}
      {v?.items?.length ? (
        <section className="py-16 md:py-32 px-8 bg-surface-container-lowest">
          <div className="max-w-[1440px] mx-auto">
            <div className="text-center mb-10 md:mb-20">
              <span className="font-label text-secondary uppercase tracking-[0.4em] text-[10px] font-bold mb-4 block">
                {v.label}
              </span>
              <h2 className="font-headline text-4xl md:text-5xl text-primary">{v.title}</h2>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(v.items.length, 4)} gap-6 md:gap-10`}>
              {v.items.map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-5 p-6 md:p-8 rounded-2xl bg-white border border-primary/5 shadow-sm">
                  <div className="w-14 h-14 rounded-full bg-secondary-container/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px] text-secondary">{item.icon}</span>
                  </div>
                  <h3 className="font-headline text-xl text-primary">{item.title}</h3>
                  <p className="text-on-surface-variant font-light text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      {/* ── Newsletter / CTA ── */}
      {nl?.enabled !== false && (
        <section className="py-16 md:py-32 bg-primary text-on-primary">
          <div className="max-w-[1440px] mx-auto px-8 text-center">
            <div className="max-w-2xl mx-auto space-y-6 md:space-y-8">
              <span className="font-label uppercase tracking-[0.4em] text-[10px] font-bold opacity-70">
                {nl?.label ?? "El Círculo Íntimo"}
              </span>
              <h2 className="font-headline text-4xl md:text-6xl leading-tight">
                {nl?.title ?? "Únete a la Sociedad Blush."}
              </h2>
              {nl?.description && (
                <p className="text-on-primary/70 font-light text-base md:text-lg leading-relaxed">
                  {nl.description}
                </p>
              )}
              <div className="mt-6">
                <NewsletterForm formType={nl?.formType} buttonText={nl?.buttonText} whatsapp={whatsapp} />
              </div>
              <p className="text-[10px] text-on-primary/40 uppercase tracking-widest pt-2">
                Al suscribirte aceptas nuestra política de privacidad.
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

