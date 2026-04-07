"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import type { Product } from "@/lib/types";

interface Props {
  products: Product[];
}

export default function SearchBar({ products }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const results =
    query.trim().length > 0
      ? products
          .filter(
            (p) =>
              p.name.toLowerCase().includes(query.toLowerCase()) ||
              p.category.toLowerCase().includes(query.toLowerCase()) ||
              p.description.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 6)
      : [];

  const handleToggle = () => {
    setOpen((prev) => {
      if (!prev) setTimeout(() => inputRef.current?.focus(), 50);
      return !prev;
    });
    setQuery("");
    setActiveIdx(-1);
  };

  // Lock body scroll on mobile when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on outside click (desktop only)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      window.location.href = `/products/${results[activeIdx].id}`;
    }
  };

  // Shared results panel content
  const resultsPanel = (
    <>
      {/* Results list */}
      {results.length > 0 && (
        <ul className="overflow-y-auto divide-y divide-outline-variant/10 bg-[#faf9f6]/90 backdrop-blur-md flex-1">
          {results.map((product, i) => (
            <li key={product.id}>
              <Link
                href={`/products/${product.id}`}
                onClick={() => { setOpen(false); setQuery(""); }}
                className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${
                  i === activeIdx ? "bg-secondary-container/30" : "hover:bg-surface-container-low"
                }`}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-surface-container-low">
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{product.name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-light mt-0.5">
                    {product.category}
                  </p>
                </div>
                <span className="text-sm font-headline text-primary shrink-0">${product.price}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* No results */}
      {query.trim().length > 0 && results.length === 0 && (
        <div className="flex items-center justify-center px-4 py-12 text-center text-sm text-on-surface-variant font-light bg-[#faf9f6]/90 backdrop-blur-md">
          Sin resultados para{" "}
          <span className="font-medium text-primary ml-1">&laquo;{query}&raquo;</span>
        </div>
      )}

      {/* Footer */}
      {results.length > 0 && (
        <div className="border-t border-outline-variant/10 px-4 py-3 shrink-0 bg-[#faf9f6]/90 backdrop-blur-md">
          <Link
            href={`/products?q=${encodeURIComponent(query)}`}
            onClick={() => { setOpen(false); setQuery(""); }}
            className="block text-center text-[10px] uppercase tracking-[0.2em] font-bold text-secondary hover:text-primary transition-colors"
          >
            Ver todos los resultados →
          </Link>
        </div>
      )}
    </>
  );

  // Mobile: full-screen overlay via portal
  const mobileOverlay = mounted && open ? createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#faf9f6]/20 backdrop-blur-sm flex flex-col md:hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-outline-variant/20 shrink-0 bg-[#faf9f6]/90 backdrop-blur-md">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIdx(-1); }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar productos..."
          className="flex-1 bg-transparent text-base text-primary placeholder:text-on-surface-variant/50 outline-none font-light"
          autoFocus
        />
        <button
          onClick={handleToggle}
          aria-label="Cerrar búsqueda"
          className="material-symbols-outlined text-primary text-[22px]"
        >
          close
        </button>
      </div>
      {resultsPanel}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        className="material-symbols-outlined hover:opacity-70 transition-opacity"
        onClick={handleToggle}
        aria-label="Buscar"
      >
        search
      </button>

      {mobileOverlay}

      {/* Desktop dropdown */}
      {open && (
        <div className="hidden md:block absolute right-0 top-9 w-[400px] z-50">
          <div className="bg-[#faf9f6] border border-outline-variant/20 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[520px]">
            {/* Input row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/10 shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIdx(-1); }}
                onKeyDown={handleKeyDown}
                placeholder="Buscar productos..."
                className="flex-1 bg-transparent text-sm text-primary placeholder:text-on-surface-variant/50 outline-none font-light"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="material-symbols-outlined text-on-surface-variant text-[18px] hover:text-primary transition-colors"
                >
                  close
                </button>
              )}
            </div>
            {resultsPanel}
          </div>
        </div>
      )}
    </div>
  );
}
