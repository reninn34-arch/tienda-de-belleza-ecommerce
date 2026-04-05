"use client";

import { useEffect, useState } from "react";

interface Product { id: string; name: string; }
interface Collection { id: string; title: string; }
interface Page { id: string; title: string; slug: string; published: boolean; }
interface Policy { id: string; title: string; slug: string; }

type LinkType = "all" | "product" | "category" | "collection" | "custom";

interface LinkPickerProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** "pages" = mostrar solo páginas y políticas; "all" (default) = todo */
  scope?: "all" | "pages";
}

const STATIC_LINKS = [
  { label: "Todos los productos", href: "/products" },
  { label: "Más vendidos", href: "/products?sort=best" },
  { label: "Novedades", href: "/novedades" },
  { label: "Colecciones", href: "/collections" },
  { label: "Tutoriales", href: "/tutorials" },
  { label: "Carrito", href: "/cart" },
];

function detectType(val: string): LinkType {
  if (!val) return "custom";
  if (val.startsWith("/products/")) return "product";
  if (val.startsWith("/products?category=")) return "category";
  if (val.startsWith("/collections/")) return "collection";
  return "custom";
}

export default function LinkPicker({ label, value, onChange, scope = "all" }: LinkPickerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [type, setType] = useState<LinkType>(detectType(value));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/products").then((r) => r.json()),
      fetch("/api/admin/settings").then((r) => r.json()),
      fetch("/api/admin/pages").then((r) => r.json()),
    ]).then(([prods, settings, pgs]) => {
      setProducts(prods ?? []);
      const cats: string[] = (settings?.categories ?? []).map((c: { value: string }) => c.value);
      setCategories(cats);
      const cols: Collection[] = (settings?.content?.collectionsPage?.collections ?? []).map(
        (c: { id: string; title: string }) => ({ id: c.id, title: c.title })
      );
      setCollections(cols);
      setPages(pgs ?? []);
      setPolicies(settings?.policies ?? []);
    });
  }, []);

  function pick(href: string) {
    onChange(href);
    setOpen(false);
  }

  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/products"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition"
        />
        <button
          type="button"
          title="Seleccionar destino"
          onClick={() => setOpen((o) => !o)}
          className="px-3 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 flex items-center gap-1 text-xs font-semibold transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">link</span>
        </button>
      </div>

      {open && (
        <div className="mt-2 border border-gray-200 rounded-2xl bg-white shadow-lg overflow-hidden z-10 relative">
          {/* Atajos rápidos — solo en modo "all" */}
          {scope === "all" && (
          <div className="px-4 pt-3 pb-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Navegación</p>
            <div className="flex flex-wrap gap-1.5">
              {STATIC_LINKS.map((l) => (
                <button
                  key={l.href}
                  type="button"
                  onClick={() => pick(l.href)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                    value === l.href
                      ? "bg-[#33172c] text-white border-[#33172c]"
                      : "border-gray-200 text-gray-600 hover:border-[#33172c] hover:text-[#33172c]"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          )}

          {/* Páginas personalizadas */}
          {pages.length > 0 && (
            <div className="px-4 pt-3 pb-1 border-t border-gray-100 mt-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Páginas</p>
              <div className="flex flex-wrap gap-1.5">
                {pages.map((pg) => {
                  const href = `/p/${pg.slug}`;
                  return (
                    <button
                      key={pg.id}
                      type="button"
                      onClick={() => pick(href)}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                        value === href
                          ? "bg-[#33172c] text-white border-[#33172c]"
                          : "border-gray-200 text-gray-600 hover:border-[#33172c] hover:text-[#33172c]"
                      }`}
                    >
                      {pg.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Políticas */}
          {policies.length > 0 && (
            <div className="px-4 pt-3 pb-1 border-t border-gray-100 mt-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Políticas</p>
              <div className="flex flex-wrap gap-1.5">
                {policies.map((pol) => {
                  const href = `/policies/${pol.slug}`;
                  return (
                    <button
                      key={pol.id}
                      type="button"
                      onClick={() => pick(href)}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                        value === href
                          ? "bg-[#33172c] text-white border-[#33172c]"
                          : "border-gray-200 text-gray-600 hover:border-[#33172c] hover:text-[#33172c]"
                      }`}
                    >
                      {pol.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categorías — solo en modo "all" */}
          {scope === "all" && categories.length > 0 && (
            <div className="px-4 pt-3 pb-1 border-t border-gray-100 mt-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Por Categoría</p>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => {
                  const href = `/products?category=${encodeURIComponent(cat)}`;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => pick(href)}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors font-medium capitalize ${
                        value === href
                          ? "bg-[#33172c] text-white border-[#33172c]"
                          : "border-gray-200 text-gray-600 hover:border-[#33172c] hover:text-[#33172c]"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Colecciones — solo en modo "all" */}
          {scope === "all" && collections.length > 0 && (
            <div className="px-4 pt-3 pb-1 border-t border-gray-100 mt-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Por Colección</p>
              <div className="flex flex-wrap gap-1.5">
                {collections.map((col) => {
                  const href = `/collections/${col.id}`;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => pick(href)}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                        value === href
                          ? "bg-[#33172c] text-white border-[#33172c]"
                          : "border-gray-200 text-gray-600 hover:border-[#33172c] hover:text-[#33172c]"
                      }`}
                    >
                      {col.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Productos individuales — solo en modo "all" */}
          {scope === "all" && products.length > 0 && (
            <div className="px-4 pt-3 pb-3 border-t border-gray-100 mt-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Producto Individual ({products.length})
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {products.map((p) => {
                  const href = `/products/${p.id}`;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => pick(href)}
                      className={`w-full text-left text-[11px] px-3 py-2 rounded-lg border transition-colors font-medium ${
                        value === href
                          ? "bg-[#33172c] text-white border-[#33172c]"
                          : "border-gray-200 text-gray-600 hover:border-[#33172c] hover:text-[#33172c]"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] text-gray-400 hover:text-gray-600 font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
