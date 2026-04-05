import Link from "next/link";
import { getAllProducts, getCollectionsPage } from "@/lib/data";

export default async function CollectionsPage() {
  const allProducts = await getAllProducts();
  const page = await getCollectionsPage();

  // Fallback in case settings haven't been set yet
  if (!page) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <p className="text-on-surface-variant">Colecciones no configuradas aún.</p>
      </div>
    );
  }

  const { hero, intro, collections, ctaBanner } = page;

  return (
    <div className="pt-20 min-h-screen bg-background">
      {/* Hero */}
      <section className="relative h-[60vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 hero-gradient z-10" />
        <img
          src={hero.image}
          alt={hero.title}
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="relative z-20 px-6 md:px-12 pb-10 md:pb-20 max-w-[1440px] w-full mx-auto">
          <span className="text-[10px] font-label uppercase tracking-[0.4em] text-white/60 mb-4 block">
            {hero.label}
          </span>
          <h1 className="font-headline text-6xl md:text-8xl text-white leading-[0.9] tracking-tight">
            {hero.title}
          </h1>
        </div>
      </section>

      {/* Intro */}
      <section className="max-w-[1440px] mx-auto px-8 lg:px-16 py-20 border-b border-surface-variant/20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-7">
            <p className="font-headline text-3xl md:text-4xl text-primary leading-relaxed">
              {intro.heading}
            </p>
          </div>
          <div className="lg:col-span-5 lg:text-right">
            <p className="text-sm text-on-surface-variant leading-relaxed font-light max-w-sm lg:ml-auto">
              {intro.body}
            </p>
          </div>
        </div>
      </section>

      {/* Collections List */}
      <section className="max-w-[1440px] mx-auto px-8 lg:px-16 py-20 space-y-16 md:space-y-32">
        {collections.map((col, idx) => {
          const featuredProducts = allProducts.filter((p) => col.productIds?.includes(p.id));
          const isEven = idx % 2 === 0;
          return (
            <div
              key={col.id}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-16 items-center ${!isEven ? "lg:grid-flow-dense" : ""}`}
            >
              {/* Image */}
              <div className={`relative group overflow-hidden ${!isEven ? "lg:col-start-2" : ""}`}>
                <Link href={`/collections/${col.id}`} className="block">
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={col.image}
                    alt={col.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Link>
              </div>

              {/* Info */}
              <div className={`flex flex-col justify-center ${!isEven ? "lg:col-start-1 lg:row-start-1" : ""}`}>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary mb-6">
                  {col.subtitle}
                </span>
                <h2 className="font-headline text-4xl lg:text-5xl text-primary mb-8 leading-tight">
                  <Link href={`/collections/${col.id}`} className="hover:text-secondary transition-colors">
                    {col.title}
                  </Link>
                </h2>
                <p className="text-on-surface-variant leading-relaxed font-light mb-10 max-w-md">
                  {col.description}
                </p>

                {/* Featured products mini */}
                {featuredProducts.length > 0 && (
                  <div className="flex gap-4 mb-10">
                    {featuredProducts.map((p) => (
                      <Link key={p.id} href={`/products/${p.id}`} className="group/card flex flex-col gap-2 w-28">
                        <div className="aspect-square overflow-hidden bg-surface-container">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                          />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-primary line-clamp-2">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-secondary font-medium">${p.price.toFixed(2)}</span>
                      </Link>
                    ))}
                  </div>
                )}

                <Link
                  href={`/collections/${col.id}`}
                  className="inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-primary hover:text-secondary transition-colors group/link self-start"
                >
                  Explorar Colección
                  <span className="material-symbols-outlined text-sm transition-transform group-hover/link:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      {/* CTA Banner */}
      <section className="bg-primary text-white py-16 md:py-24 px-8 text-center mt-20">
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/50 block mb-6">
          {ctaBanner.label}
        </span>
        <h3 className="font-headline text-4xl md:text-5xl mb-8">
          {ctaBanner.title}
        </h3>
        <p className="text-sm text-white/60 font-light mb-12 max-w-md mx-auto leading-relaxed">
          {ctaBanner.body}
        </p>
        <Link
          href={ctaBanner.buttonLink}
          className="inline-block border border-white/30 text-white px-12 py-4 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-primary transition-all"
        >
          {ctaBanner.buttonText}
        </Link>
      </section>
    </div>
  );
}
