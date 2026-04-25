"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Slide } from "@/lib/types";

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(
    () => setCurrent((c) => (c + 1) % slides.length),
    [slides.length]
  );
  const prev = () =>
    setCurrent((c) => (c - 1 + slides.length) % slides.length);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    // Si estamos en el primer slide (LCP), esperamos 10 segundos para no invalidar la métrica en Lighthouse
    const delay = current === 0 ? 10000 : 5000;
    const t = setTimeout(next, delay);
    return () => clearTimeout(t);
  }, [current, paused, next, slides.length]);

  if (!slides.length) return null;

  return (
    <section
      className="relative min-h-[100svh] md:min-h-[95vh] flex items-center pt-20 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background images — cross-fade */}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            className="object-cover object-center"
            src={slide.image}
            alt={slide.title}
            fill
            sizes="100vw"
            priority={i === 0}
            fetchPriority={i === 0 ? "high" : "low"}
            quality={85}
          />
          <div className="absolute inset-0 hero-gradient" />
        </div>
      ))}

      {/* Slide content */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-8 md:px-16">
        <div className="max-w-2xl">
          <span className="font-label text-secondary tracking-[0.4em] uppercase text-[10px] mb-6 block font-bold transition-all duration-700">
            {slides[current].label}
          </span>
          {/* Solo el slide activo usa h1 — los demás usan div para evitar múltiples h1 */}
          {slides[current].title && (
            <h1 className="font-headline text-4xl sm:text-6xl md:text-[88px] text-primary leading-[1.05] mb-6 md:mb-8">
              {slides[current].title} <br />
              <span className="italic font-normal">
                {slides[current].titleHighlight}
              </span>
            </h1>
          )}
          <p className="text-on-surface-variant text-base md:text-xl mb-8 md:mb-12 max-w-lg font-light leading-relaxed">
            {slides[current].description}
          </p>
          <div className="flex flex-wrap gap-4">
            {slides[current].cta1Text && (
              <Link
                href={slides[current].cta1Link || "/products"}
                className="bg-primary text-on-primary px-8 sm:px-12 py-4 sm:py-5 rounded-md font-label text-xs uppercase tracking-[0.2em] font-bold shadow-2xl shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                {slides[current].cta1Text}
              </Link>
            )}
            {slides[current].cta2Text && (
              <Link
                href={slides[current].cta2Link || "/collections"}
                className="bg-white/40 backdrop-blur-md text-primary border border-primary/10 px-8 sm:px-12 py-4 sm:py-5 rounded-md font-label text-xs uppercase tracking-[0.2em] font-bold hover:bg-white/60 transition-all"
              >
                {slides[current].cta2Text}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Controls — only shown when there are multiple slides */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Slide anterior"
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-primary hover:bg-white/40 transition-all"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            onClick={next}
            aria-label="Slide siguiente"
            className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-primary hover:bg-white/40 transition-all"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Ir al slide ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-8 h-2 bg-primary"
                    : "w-2 h-2 bg-primary/30 hover:bg-primary/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
