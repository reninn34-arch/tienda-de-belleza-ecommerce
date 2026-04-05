"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SocialIcons from "./SocialIcons";
import type { SocialLinks } from "./SocialIcons";

interface CustomPage {
  id: string;
  title: string;
  slug: string;
}

interface Collection {
  id: string;
  title: string;
  ctaLink?: string;
}

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/collections", label: "Colecciones", hasChildren: true },
  { href: "/novedades", label: "Novedades" },
  { href: "/mas-vendidos", label: "Más Vendidos" },
  { href: "/products", label: "Productos" },
  { href: "/tutorials", label: "Tutoriales" },
];

const C = {
  bg: "#faf9f6",
  primary: "#33172c",
  muted: "#4e4449",
  border: "#d1c3c9",
  dot: "#8c4b55",
};

export default function NavSidebar({ customPages, collections, socialLinks }: { customPages: CustomPage[]; collections: Collection[]; socialLinks: SocialLinks }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const collectionChildren = collections.map((c) => ({
    href: `/collections/${c.id}`,
    label: c.title,
  }));

  const allLinks = [
    ...LINKS,
    ...customPages.map((p) => ({ href: `/p/${p.slug}`, label: p.title, hasChildren: false })),
  ];

  const portal = mounted ? createPortal(
    <>
      {/* Backdrop — attached to body, no stacking context interference */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(0,0,0,0.5)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          width: "270px",
          height: "100dvh",
          background: C.bg,
          boxShadow: "4px 0 32px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <span style={{ fontSize: "10px", fontFamily: "var(--font-manrope)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.28em", color: C.muted }}>
            Menú
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="material-symbols-outlined"
            style={{ color: C.primary, cursor: "pointer", background: "none", border: "none", padding: 0, display: "flex", alignItems: "center" }}
          >
            close
          </button>
        </div>

        {/* Links */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 24px" }}>
          {allLinks.map(({ href, label, hasChildren }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            const isCollections = href === "/collections";
            const children = isCollections ? collectionChildren : [];

            return (
              <div key={href}>
                {/* Main row */}
                <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${C.border}` }}>
                  <Link
                    href={href}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "14px 0",
                      fontSize: "11px",
                      fontFamily: "var(--font-manrope)",
                      fontWeight: active ? 700 : 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.22em",
                      color: active ? C.primary : C.muted,
                      textDecoration: "none",
                    }}
                  >
                    {active && (
                      <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: C.dot, flexShrink: 0 }} />
                    )}
                    {label}
                  </Link>
                  {isCollections && hasChildren && children.length > 0 && (
                    <button
                      onClick={() => setCollectionsOpen((v) => !v)}
                      aria-label="Expandir colecciones"
                      className="material-symbols-outlined"
                      style={{
                        color: C.muted,
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        fontSize: "18px",
                        transform: collectionsOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      expand_more
                    </button>
                  )}
                </div>

                {/* Sub-links */}
                {isCollections && hasChildren && children.length > 0 && (
                  <div style={{
                    overflow: "hidden",
                    maxHeight: collectionsOpen ? `${children.length * 52}px` : "0px",
                    transition: "max-height 0.25s ease",
                  }}>
                    {children.map((sub) => {
                      const subActive = pathname === sub.href || pathname.startsWith(sub.href + "/");
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "12px 0 12px 16px",
                            borderBottom: `1px solid ${C.border}`,
                            fontSize: "10px",
                            fontFamily: "var(--font-manrope)",
                            fontWeight: subActive ? 700 : 400,
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            color: subActive ? C.primary : C.muted,
                            textDecoration: "none",
                          }}
                        >
                          {subActive && (
                            <span style={{ display: "inline-block", width: "4px", height: "4px", borderRadius: "50%", background: C.dot, flexShrink: 0 }} />
                          )}
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Social links */}
        <div style={{ padding: "20px 24px", borderTop: `1px solid ${C.border}`, flexShrink: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
          <span style={{ fontSize: "9px", fontFamily: "var(--font-manrope)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: C.muted }}>
            Síguenos
          </span>
          <SocialIcons links={socialLinks} size={18} />
        </div>

        {/* Account */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "11px",
              fontFamily: "var(--font-manrope)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              color: C.muted,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              width: "100%",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: C.primary }}>person</span>
            Mi Cuenta
          </button>
        </div>

      </div>
    </>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="material-symbols-outlined"
        style={{ color: C.primary, cursor: "pointer", background: "none", border: "none", padding: 0, display: "flex", alignItems: "center" }}
      >
        menu
      </button>
      {portal}
    </>
  );
}
