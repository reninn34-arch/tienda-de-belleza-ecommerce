import ProductCard from "@/components/store/ProductCard";
import { Product } from "@/lib/types";
import Link from "next/link";

interface Props {
  label: string;
  title: string;
  subtitle: string;
  products: Product[];
  backHref?: string;
  backLabel?: string;
}

export default function CuratedProductsPage({ label, title, subtitle, products, backHref = "/products", backLabel = "Ver todo el catálogo" }: Props) {
  return (
    <div className="pt-20 min-h-screen bg-background">
      {/* Hero */}
      <div className="max-w-[1920px] mx-auto px-8 lg:px-16 py-20 border-b border-surface-variant/20">
        <span className="text-[10px] font-label uppercase tracking-[0.3em] text-secondary font-bold">
          {label}
        </span>
        <h1 className="text-6xl md:text-8xl font-headline text-primary tracking-tight mt-3 mb-4">
          {title}
        </h1>
        <p className="text-on-surface-variant text-sm max-w-md">{subtitle}</p>
        <div className="flex items-center gap-4 mt-8">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface/40">
            {products.length} {products.length === 1 ? "producto" : "productos"}
          </span>
          <div className="w-8 h-[1px] bg-outline-variant/30" />
          <Link
            href={backHref}
            className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary hover:text-secondary transition-colors underline underline-offset-4"
          >
            {backLabel}
          </Link>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-[1920px] mx-auto px-8 lg:px-16 py-16">
        {products.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-2xl font-headline text-primary/30 mb-3">Sin productos todavía</p>
            <p className="text-sm text-on-surface-variant">
              El administrador aún no ha seleccionado productos para esta sección.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-16">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
