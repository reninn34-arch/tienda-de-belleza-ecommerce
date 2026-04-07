import Link from "next/link";
import Image from "next/image";
import { getPageBySlug, getAllProducts } from "@/lib/data";
import { notFound } from "next/navigation";
import { PageBlock } from "@/lib/types";
import type { Product } from "@/lib/types";
import ProductCard from "@/components/store/ProductCard";
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  return { title: page?.title ?? "Página" };
}

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  const allProducts = await getAllProducts();

  return (
    <div className="pt-20 min-h-screen bg-background">
      {/* Page title */}
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-6">
        <h1 className="text-5xl md:text-6xl font-headline text-primary tracking-tight">
          {page.title}
        </h1>
      </div>

      {/* Blocks */}
      <div className="max-w-5xl mx-auto px-6 pb-20 space-y-12">
        {(page.blocks ?? []).map((block: PageBlock) => {
          if (block.type === "text") {
            return (
              <div
                key={block.id}
                className="prose prose-lg max-w-none text-on-surface-variant leading-relaxed"
                dangerouslySetInnerHTML={{ __html: block.content ?? "" }}
              />
            );
          }

          if (block.type === "banner") {
            return (
              <div key={block.id} className="relative rounded-3xl overflow-hidden bg-[#33172c]/10 min-h-[340px] flex items-end">
                {block.image && (
                  <Image
                    src={block.image}
                    alt={block.title ?? ""}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                )}
                <div className="relative z-10 p-10 bg-gradient-to-t from-black/60 via-black/20 to-transparent w-full">
                  {block.label && (
                    <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">
                      {block.label}
                    </p>
                  )}
                  {block.title && (
                    <h2 className="text-3xl md:text-4xl font-headline text-white mb-2">
                      {block.title}
                    </h2>
                  )}
                  {block.subtitle && (
                    <p className="text-white/80 mb-5 max-w-lg">{block.subtitle}</p>
                  )}
                  {block.ctaText && block.ctaLink && (
                    <Link
                      href={block.ctaLink}
                      className="inline-block px-6 py-2.5 bg-white text-[#33172c] text-sm font-bold rounded-full hover:bg-white/90 transition-colors"
                    >
                      {block.ctaText}
                    </Link>
                  )}
                </div>
              </div>
            );
          }

          if (block.type === "products") {
            const products = (block.productIds ?? [])
              .map((pid) => allProducts.find((p) => p.id === pid))
              .filter(Boolean) as Product[];
            if (products.length === 0) return null;
            return (
              <div key={block.id}>
                {block.sectionTitle && (
                  <h2 className="text-2xl font-headline text-primary mb-6">{block.sectionTitle}</h2>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            );
          }

          return null;
        })}

        {(page.blocks ?? []).length === 0 && (
          <p className="text-gray-400 text-sm">Esta página no tiene contenido aún.</p>
        )}
      </div>
    </div>
  );
}
