"use client";

import { useRef } from "react";
import ProductCard from "./ProductCard";
import { Product } from "@/lib/types";

export default function ProductCarousel({ products }: { products: Product[] }) {
  const ref = useRef<HTMLDivElement>(null);

  function scroll(dir: 1 | -1) {
    if (!ref.current) return;
    const first = ref.current.children[0] as HTMLElement | null;
    const step = first ? first.offsetWidth + 32 : 320;
    ref.current.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  return (
    <div className="relative -mx-2">
      {/* Scroll container */}
      <div
        ref={ref}
        className="flex gap-8 overflow-x-auto pb-6 scroll-smooth snap-x snap-mandatory px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="snap-start flex-none w-[78vw] sm:w-72 lg:w-80"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Prev arrow */}
      <button
        onClick={() => scroll(-1)}
        aria-label="Anterior"
        className="absolute -left-5 top-[40%] -translate-y-1/2 hidden md:flex w-10 h-10 rounded-full bg-white border border-primary/10 shadow-lg items-center justify-center text-primary hover:bg-primary hover:text-white transition-all z-10"
      >
        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
      </button>

      {/* Next arrow */}
      <button
        onClick={() => scroll(1)}
        aria-label="Siguiente"
        className="absolute -right-5 top-[40%] -translate-y-1/2 hidden md:flex w-10 h-10 rounded-full bg-white border border-primary/10 shadow-lg items-center justify-center text-primary hover:bg-primary hover:text-white transition-all z-10"
      >
        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
      </button>
    </div>
  );
}
