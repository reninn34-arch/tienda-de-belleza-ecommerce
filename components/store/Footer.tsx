import Link from "next/link";
import SocialIcons from "./SocialIcons";
import { getSocialLinks, getPolicies, getFooterContent } from "@/lib/data";

export default async function Footer() {
  const socialLinks = await getSocialLinks();
  const policies = await getPolicies();
  const footer = await getFooterContent();

  const brandName = footer?.brandName ?? "The Editorial Alchemist";
  const brandDesc = footer?.brandDesc ?? "Creando un mundo de belleza transformadora y arte consciente a través de la precisión científica.";
  const columns = footer?.columns ?? [];
  const copyright = footer?.copyright ?? "The Editorial Alchemist. Pigmento Puro. Arte Absoluto.";
  const tagline = footer?.tagline ?? "Creado para el Alquimista en ti.";

  return (
    <footer className="w-full py-16 md:py-24 px-6 md:px-8 bg-surface-container-lowest text-primary">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-16 max-w-7xl mx-auto">
        <div className="col-span-2 md:col-span-1">
          <h3 className="text-2xl font-headline italic mb-8">{brandName}</h3>
          <p className="font-label text-[10px] tracking-[0.2em] uppercase text-on-surface-variant leading-loose mb-10">
            {brandDesc}
          </p>
          <SocialIcons links={socialLinks} size={20} />
        </div>
        {columns.map((col, i) => (
          <div key={i} className="flex flex-col gap-6">
            <h4 className="font-label text-[11px] tracking-[0.3em] uppercase font-bold">{col.title}</h4>
            <div className="flex flex-col gap-4">
              {col.links.filter((l) => l.label).map((link) => (
                <Link key={link.label} className="font-label text-[10px] tracking-widest uppercase text-on-surface-variant hover:text-secondary transition-colors" href={link.href}>{link.label}</Link>
              ))}
            </div>
          </div>
        ))}
        <div className="flex flex-col gap-6">
          <h4 className="font-label text-[11px] tracking-[0.3em] uppercase font-bold">Legal</h4>
          <div className="flex flex-col gap-4">
            {policies.map((p) => (
              <Link
                key={p.slug}
                className="font-label text-[10px] tracking-widest uppercase text-on-surface-variant hover:text-secondary transition-colors"
                href={`/policies/${p.slug}`}
              >
                {p.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-16 md:mt-24 pt-10 border-t border-primary/5 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <p className="font-label text-[10px] tracking-[0.3em] uppercase text-on-surface-variant/80">
          © {new Date().getFullYear()} {copyright}
        </p>
        <p className="font-label text-[10px] tracking-[0.3em] uppercase text-on-surface-variant/80">
          {tagline}
        </p>
      </div>
    </footer>
  );
}
