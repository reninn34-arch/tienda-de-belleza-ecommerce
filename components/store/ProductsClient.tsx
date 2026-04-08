"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ProductCard from "@/components/store/ProductCard";
import { Product } from "@/lib/types";

const CATEGORY_LABEL: Record<string, string> = {
  permanent: "Permanente",
  "semi-permanent": "Semi-Permanente",
  "demi-permanent": "Demi-Permanente",
  treatments: "Tratamientos",
  lightener: "Aclarante",
  tools: "Herramientas",
};

const MAX_PRICE_DEFAULT = 500;

interface Props {
  initialProducts: Product[];
  categories: string[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
  activeCategory?: string;
  activeSort?: string;
  activeMaxPrice?: number;
}

export default function ProductsClient({
  initialProducts,
  categories,
  totalPages,
  currentPage,
  totalItems,
  activeCategory,
  activeSort = "featured",
  activeMaxPrice,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Local state for price slider (debounced before pushing to URL)
  const maxProductPrice = MAX_PRICE_DEFAULT;
  const [sliderValue, setSliderValue] = useState(activeMaxPrice ?? maxProductPrice);
  const priceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync slider if server-side activeMaxPrice changes (back/forward nav)
  useEffect(() => {
    setSliderValue(activeMaxPrice ?? maxProductPrice);
  }, [activeMaxPrice, maxProductPrice]);

  /** Builds a new query string, resetting page to 1 when a non-page param changes */
  const buildQuery = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      let changedNonPage = false;
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
        if (key !== "page") changedNonPage = true;
      }
      if (changedNonPage) params.set("page", "1");
      return params.toString();
    },
    [searchParams]
  );

  function onCategoryChange(cat: string) {
    const isSame = activeCategory === cat;
    router.push(`${pathname}?${buildQuery({ category: isSame ? undefined : cat })}`);
  }

  function onSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`${pathname}?${buildQuery({ sort: e.target.value })}`);
  }

  function onPriceChange(value: number) {
    setSliderValue(value);
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    priceDebounceRef.current = setTimeout(() => {
      const maxP = value >= maxProductPrice ? undefined : String(value);
      router.push(`${pathname}?${buildQuery({ maxPrice: maxP })}`);
    }, 500);
  }

  function goToPage(page: number) {
    router.push(`${pathname}?${buildQuery({ page: String(page) })}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearFilters() {
    router.push(pathname);
  }

  const hasFilters = !!(activeCategory || activeMaxPrice || (activeSort && activeSort !== "featured"));

  return (
    <div className="max-w-[1920px] mx-auto flex flex-col lg:flex-row">
      {/* ── Mobile filter bar ── */}
      <div className="lg:hidden border-b border-surface-variant/20 bg-background sticky top-[72px] z-30">
        <div className="flex items-center justify-between px-6 py-3">
          <button
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Filtros
            {hasFilters && <span className="w-2 h-2 rounded-full bg-secondary inline-block" />}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface/40">
              {totalItems} {totalItems === 1 ? "Producto" : "Productos"}
            </span>
            <select
              value={activeSort}
              onChange={onSortChange}
              className="bg-transparent border-none text-[10px] font-bold text-primary focus:ring-0 cursor-pointer uppercase tracking-widest appearance-none"
            >
              <option value="featured">Destacados</option>
              <option value="price-asc">Precio ↑</option>
              <option value="price-desc">Precio ↓</option>
              <option value="name">A–Z</option>
            </select>
          </div>
        </div>

        {mobileFiltersOpen && (
          <div className="px-6 pb-5 pt-2 space-y-6 border-t border-surface-variant/20 bg-background">
            {/* Mobile categories */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant font-bold block">
                Categoría
              </span>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => onCategoryChange(cat)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                      activeCategory === cat
                        ? "bg-primary text-white border-primary"
                        : "border-surface-variant text-on-surface-variant hover:border-primary"
                    }`}
                  >
                    {CATEGORY_LABEL[cat] ?? cat}
                  </button>
                ))}
              </div>
            </div>
            {/* Mobile price */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant font-bold block">
                Precio Máximo: ${sliderValue}
              </span>
              <input
                type="range"
                min={0}
                max={maxProductPrice}
                step={5}
                value={sliderValue}
                onChange={(e) => onPriceChange(Number(e.target.value))}
                className="w-full cursor-pointer accent-primary"
              />
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-[10px] uppercase tracking-[0.2em] font-bold text-secondary hover:underline"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col gap-10 py-16 px-10 h-screen w-[340px] sticky top-20 bg-background border-r border-surface-variant/20 overflow-y-auto">
        <div>
          <h2 className="text-sm font-label uppercase tracking-[0.2em] text-primary mb-6 font-bold">
            Refinar Archivo
          </h2>
          <div className="space-y-10">
            {/* Categories */}
            <div className="space-y-4">
              <span className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant font-bold">
                Categoría
              </span>
              <div className="flex flex-col gap-3">
                {categories.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-3 text-xs text-on-surface-variant cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={activeCategory === cat}
                      onChange={() => onCategoryChange(cat)}
                      className="w-4 h-4 border-outline-variant focus:ring-0 rounded-none bg-transparent accent-primary cursor-pointer"
                    />
                    <span className="group-hover:text-primary transition-colors">
                      {CATEGORY_LABEL[cat] ?? cat}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-6">
              <span className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant font-bold">
                Precio Máximo
              </span>
              <div className="px-1">
                <input
                  type="range"
                  min={0}
                  max={maxProductPrice}
                  step={5}
                  value={sliderValue}
                  onChange={(e) => onPriceChange(Number(e.target.value))}
                  className="w-full cursor-pointer accent-primary"
                />
                <div className="flex justify-between mt-3 text-[10px] font-bold text-primary tracking-widest">
                  <span>$0</span>
                  <span>${sliderValue}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={clearFilters}
          className={`mt-auto text-[10px] uppercase tracking-[0.2em] font-bold transition-colors text-left border-t border-surface-variant/20 pt-6 ${
            hasFilters
              ? "text-primary hover:text-secondary"
              : "text-on-surface/40 hover:text-primary"
          }`}
        >
          Limpiar Filtros
        </button>
      </aside>

      {/* ── Product Grid Area ── */}
      <section className="flex-1 px-6 lg:px-16 py-10 lg:py-16">
        {/* Header & Sort */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10 md:mb-16 border-b border-surface-variant/30 pb-8 md:pb-10">
          <div className="space-y-3">
            <span className="text-[10px] font-label uppercase tracking-[0.3em] text-secondary font-bold">
              Selección Curada
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline text-primary tracking-tight">
              El Archivo de Color
            </h1>
          </div>
          <div className="hidden lg:flex items-center gap-6">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface/40">
              {totalItems} {totalItems === 1 ? "Producto" : "Productos"}
            </span>
            <div className="flex items-center gap-2 cursor-pointer">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">
                Ordenar Por
              </span>
              <select
                value={activeSort}
                onChange={onSortChange}
                className="bg-transparent border-none text-[11px] font-bold text-primary focus:ring-0 cursor-pointer py-0 uppercase tracking-widest appearance-none pr-6 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI0IiB2aWV3Qm94PSIwIDAgOCA0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0wIDBMNCA0TDggMEgwWiIgZmlsbD0iIzMzMTcyQyIvPjwvc3ZnPg==')] bg-[right_center] bg-no-repeat"
              >
                <option value="featured">Selección Destacada</option>
                <option value="price-asc">Precio: Menor a Mayor</option>
                <option value="price-desc">Precio: Mayor a Menor</option>
                <option value="name">Nombre A–Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {initialProducts.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-2xl font-headline text-primary/40 mb-3">Sin resultados</p>
            <p className="text-sm text-on-surface-variant">
              Prueba con otros filtros o{" "}
              <button
                onClick={clearFilters}
                className="underline hover:text-primary transition-colors"
              >
                limpia la selección
              </button>
              .
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-16">
            {initialProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-16 pt-10 border-t border-surface-variant/20">
            <button
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              className="flex items-center gap-2 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] border border-surface-variant text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary hover:text-white hover:border-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Anterior
            </button>

            {/* Page numbers */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`w-9 h-9 text-[10px] font-bold tracking-widest transition-colors ${
                    p === currentPage
                      ? "bg-primary text-white"
                      : "text-on-surface-variant hover:bg-surface-variant"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <span className="sm:hidden text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface/40">
              {currentPage} / {totalPages}
            </span>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
              className="flex items-center gap-2 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] border border-surface-variant text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary hover:text-white hover:border-primary transition-colors"
            >
              Siguiente
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
