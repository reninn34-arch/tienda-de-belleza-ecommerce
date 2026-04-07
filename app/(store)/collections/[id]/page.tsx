import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getCollectionById } from "@/lib/data";
import ProductCard from "@/components/store/ProductCard";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { collection } = await getCollectionById(id);
  return { title: collection?.title ?? "Colección" };
}

export default async function CollectionPage({ params }: Props) {
  const { id } = await params;
  const { collection, allProducts } = await getCollectionById(id);

  if (!collection) notFound();

  const collectionProducts = allProducts.filter((p) => collection.productIds?.includes(p.id));

  return (
    <div className="pt-20 min-h-screen bg-background">
      {/* Hero */}
      <section className="relative h-[70vh] flex items-end overflow-hidden">
        <Image
          src={collection.image}
          alt={collection.title}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
        <div className="relative z-10 max-w-[1440px] w-full mx-auto px-8 lg:px-16 pb-20">
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 text-white/60 text-[10px] font-label uppercase tracking-widest mb-8 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Todas las Colecciones
          </Link>
          <span className="text-[10px] font-label uppercase tracking-[0.4em] text-white/60 mb-4 block font-bold">
            {collection.subtitle}
          </span>
          <h1 className="font-headline text-6xl md:text-8xl text-white leading-[0.9] tracking-tight">
            {collection.title}
          </h1>
        </div>
      </section>

      {/* Description */}
      <section className="max-w-[1440px] mx-auto px-8 lg:px-16 py-20 border-b border-surface-variant/20">
        <div className="max-w-2xl">
          <p className="font-headline text-2xl md:text-3xl text-primary leading-relaxed">
            {collection.description}
          </p>
        </div>
      </section>

      {/* Productos de la Colección */}
      {collectionProducts.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-8 lg:px-16 py-20">
          <div className="flex items-end justify-between mb-16">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary mb-4 block">
                Colección Completa
              </span>
              <h2 className="font-headline text-4xl text-primary">Productos de la Colección</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {collectionProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Back CTA */}
      <section className="bg-surface-container-lowest py-20 text-center">
        <p className="font-label text-[10px] uppercase tracking-[0.3em] text-on-surface-variant mb-6">
          Continúa explorando
        </p>
        <Link
          href="/collections"
          className="inline-flex items-center gap-3 bg-primary text-white px-10 py-4 font-label text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary/90 transition-all"
        >
          <span className="material-symbols-outlined text-sm">collections_bookmark</span>
          Todas las Colecciones
        </Link>
      </section>
    </div>
  );
}
