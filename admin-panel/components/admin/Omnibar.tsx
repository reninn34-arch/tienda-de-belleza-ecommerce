"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface SearchResult {
  id: string;
  type: "product" | "order" | "customer" | "page";
  title: string;
  subtitle?: string;
  url: string;
  image?: string;
  icon?: string;
}

interface OmnibarProps {
  open: boolean;
  onClose: () => void;
}

export default function Omnibar({ open, onClose }: OmnibarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    
    if (query.trim().length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Error searching:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results.length > 0 && results[selectedIndex]) {
          const selected = results[selectedIndex];
          handleNavigate(selected.url);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, results, selectedIndex, onClose]);

  // Prevent scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleNavigate(url: string) {
    onClose();
    router.push(url);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#0f0a1a]/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden mx-4 flex flex-col border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Input */}
        <div className="flex items-center px-4 py-4 border-b border-gray-100">
          <span className="material-symbols-outlined text-gray-400 text-[24px] mr-3">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos, pedidos, clientes o ajustes..."
            className="flex-1 bg-transparent border-none outline-none text-gray-900 text-lg placeholder:text-gray-400"
            autoComplete="off"
            spellCheck="false"
          />
          {loading && (
            <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin ml-3" />
          )}
          <div className="flex items-center gap-1 ml-3 px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-400">
            <span>ESC</span>
          </div>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim().length === 0 ? (
            <div className="p-8 text-center text-gray-400 flex flex-col items-center">
              <span className="material-symbols-outlined text-[48px] mb-3 opacity-20">search</span>
              <p className="text-sm">Empieza a escribir para buscar en toda la tienda</p>
              <div className="flex gap-2 mt-4">
                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Productos</span>
                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Pedidos</span>
                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Clientes</span>
              </div>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-8 text-center text-gray-500">
              <p>No se encontraron resultados para "{query}"</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleNavigate(result.url)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                    selectedIndex === index ? "bg-gray-100" : "hover:bg-gray-50"
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {/* Icon or Image */}
                  {result.image ? (
                    <Image
                      src={result.image}
                      alt={result.title}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-lg object-cover bg-gray-200 shrink-0"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center ${
                      result.type === "page" ? "bg-[#33172c]/10 text-[#33172c]" :
                      result.type === "order" ? "bg-emerald-100 text-emerald-700" :
                      result.type === "customer" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {result.icon || "search"}
                      </span>
                    </div>
                  )}

                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${
                      selectedIndex === index ? "text-gray-900" : "text-gray-700"
                    }`}>
                      {result.title}
                    </p>
                    {result.subtitle && (
                      <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                    )}
                  </div>
                  
                  {/* Type Badge */}
                  <div className="shrink-0 px-2.5 py-1 rounded-md bg-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {result.type === "page" ? "Módulo" : result.type}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-gray-200 rounded font-mono text-[10px]">↑↓</span> Navegar</span>
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-gray-200 rounded font-mono text-[10px]">↵</span> Seleccionar</span>
          </div>
          <span className="font-semibold tracking-widest text-[10px] uppercase text-gray-400">Blush Admin</span>
        </div>

      </div>
    </div>
  );
}
