import { Product, Slide, CollectionsPage, Collection, CuratedPage, Page, TutorialsData, HomeContent, FooterContent } from "./types";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

async function getSettings(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`${BACKEND}/api/settings`, {
      next: { tags: ["settings"], revalidate: 86400 },
    });
    return res.json() as Promise<Record<string, unknown>>;
  } catch {
    return {};
  }
}

export async function getStoreName(): Promise<string> {
  const s = await getSettings();
  return (s?.storeName as string) ?? "The Editorial Alchemist";
}

export async function getBranding(): Promise<{ logoUrl: string; faviconUrl: string }> {
  const s = await getSettings();
  return (s?.branding as { logoUrl: string; faviconUrl: string }) ?? { logoUrl: "", faviconUrl: "" };
}

export async function getSocialLinks(): Promise<{ instagram: string; tiktok: string; facebook: string; whatsapp: string }> {
  const s = await getSettings();
  return (s?.socialLinks as { instagram: string; tiktok: string; facebook: string; whatsapp: string }) ??
    { instagram: "", tiktok: "", facebook: "", whatsapp: "" };
}

export interface Policy {
  id: string;
  title: string;
  slug: string;
  icon: string;
  content: string;
}

export async function getPolicies(): Promise<Policy[]> {
  const s = await getSettings();
  return (s?.policies as Policy[]) ?? [];
}

export async function getPolicyBySlug(slug: string): Promise<Policy | undefined> {
  const policies = await getPolicies();
  return policies.find((p) => p.slug === slug);
}

export async function getSlides(): Promise<Slide[]> {
  const s = await getSettings();
  return ((s?.content as Record<string, unknown>)?.slides as Slide[]) ?? [];
}

export async function getCollectionsPage(): Promise<CollectionsPage> {
  const s = await getSettings();
  return (s?.content as Record<string, unknown>)?.collectionsPage as CollectionsPage;
}

export async function getCollectionById(id: string): Promise<{ collection: Collection | undefined; allProducts: Product[] }> {
  const [page, allProducts] = await Promise.all([getCollectionsPage(), getAllProducts()]);
  const collection = page?.collections?.find((c) => c.id === id);
  return { collection, allProducts };
}

export async function getProductById(id: string): Promise<Product | undefined> {
  try {
    const res = await fetch(`${BACKEND}/api/products/${id}`, {
      next: { tags: ["products"], revalidate: 86400 },
    });
    if (!res.ok) return undefined;
    return res.json() as Promise<Product>;
  } catch {
    return undefined;
  }
}

export async function getAllProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${BACKEND}/api/products`, {
      next: { tags: ["products"], revalidate: 86400 },
    });
    return res.json() as Promise<Product[]>;
  } catch {
    return [];
  }
}

export async function getCategories(): Promise<string[]> {
  const products = await getAllProducts();
  const cats = products.map((p) => p.category);
  return Array.from(new Set(cats));
}

export async function getNovedades(): Promise<{ page: CuratedPage; products: Product[] }> {
  const [s, all] = await Promise.all([getSettings(), getAllProducts()]);
  const page = (s?.content as Record<string, unknown>)?.novedades as CuratedPage;
  const ids: string[] = page?.productIds ?? [];
  const products = ids.map((id) => all.find((p) => p.id === id)).filter(Boolean) as Product[];
  return { page, products };
}

export async function getBestSellers(): Promise<{ page: CuratedPage; products: Product[] }> {
  const [s, all] = await Promise.all([getSettings(), getAllProducts()]);
  const page = (s?.content as Record<string, unknown>)?.bestSellers as CuratedPage;
  const ids: string[] = page?.productIds ?? [];
  const products = ids.map((id) => all.find((p) => p.id === id)).filter(Boolean) as Product[];
  return { page, products };
}

export async function getAllPages(): Promise<Page[]> {
  try {
    const res = await fetch(`${BACKEND}/api/pages`, {
      next: { tags: ["pages"], revalidate: 86400 },
    });
    const pages = await res.json() as Page[];
    return pages.filter((p) => p.published);
  } catch {
    return [];
  }
}

export async function getPageBySlug(slug: string): Promise<Page | undefined> {
  try {
    const pages = await getAllPages();
    return pages.find((p) => p.slug === slug);
  } catch {
    return undefined;
  }
}

export async function getHomeContent(): Promise<HomeContent> {
  const s = await getSettings();
  return (s?.content as Record<string, unknown>)?.home as HomeContent;
}

export async function getFooterContent(): Promise<FooterContent | null> {
  const s = await getSettings();
  return (s?.footer as FooterContent) ?? null;
}

export async function getTutorials(): Promise<TutorialsData> {
  try {
    const res = await fetch(`${BACKEND}/api/tutorials`, {
      next: { tags: ["tutorials"], revalidate: 86400 },
    });
    return res.json() as Promise<TutorialsData>;
  } catch {
    return { videos: [], faq: [] } as unknown as TutorialsData;
  }
}

// ── The products below are kept as a seed reference — delete once admin has real data ──
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _seedProducts: Product[] = [
  {
    id: "midnight-plum-serum",
    name: "Midnight Plum Serum",
    description: "Deep Permanent Hue. Transformative, high-performance hair color for the discerning individual. Experience the depth of professional artistry with formulas that nourish as they pigment.",
    price: 42,
    category: "permanent",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDVM0urFXlTx1vuNn3M7emmEIKUb67ccdh1aUMRGJoAOK1DZr3LKHFvRRobcl6CoK5B3bBkINc--EeCP2WQDNuwBjn6w8_XxQhEh3l7bKoPjJ1kw-1jS0c2NFI7UD-tl5pDdMCDylj3mGpdcYrD0XODVyhrJiZQreqaU3Ft119QhS9goNGW0jOnUveIhMSVStj0OvxhtKLngUgI42FYjVno1E-SFsb5aNuCF7Yv3dZGeaMcMIRS8n5ovvDABON4rWwmf-iecZ4QtsY",
    badge: "Top Rated",
    features: ["100% Vegan Formula", "0% Ammonia", "Deep Pigmentation"]
  },
  {
    id: "rose-gold-glaze",
    name: "Rose Gold Glaze",
    description: "Luminous Semi-Permanent color mask. Add a wash of elegant rose gold to pre-lightened or blonde hair while deeply conditioning.",
    price: 38,
    category: "semi-permanent",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBaSxpg4wCzZ5oJrzawNJEFJtT3gL7wmwO9LzUGAAhiInqOnMBVipNCa9z_Bc2Tg3Ormqlxmanrzq-GBrI7AtEbZ1ND7Ca6fiiRWRIsfV5dOeMENy-PYByq-XglDU4F2E-jDINFlRdssjNMmqB72lmqQGk6nUxALmvFVcGq7OLMMjD4tdxxrikENRtw5mvH_44dy4hW1eHyht3uN0E-U__wX9cf4pr6huWqgg2by20x8D0l6C00bh8x024rfqUUFlhw2mKAF1PrFn4",
    features: ["Lasts up to 10 washes", "Intense hydration", "Pastel tone"]
  },
  {
    id: "liquid-gold-elixir",
    name: "Liquid Gold Elixir",
    description: "Restorative Post-Color Oil. Seal in your new color and lock out damage with this lightweight, nutrient-dense hair oil.",
    price: 56,
    category: "treatments",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDeBlSUflDn30Q5_8vG6yT1UIiVUcpRKzAu28gFYc5rLUPrKEqCpNdt3F-VYZlG6-HLZTPP3Fe7FDnTdybYEB0daEJpNHLEm8jdx7KwWvQo6jnCRrnHZQHC_PLlnxba5-7gO7Msk4nDlkRQLvUvR3BLCv94rOITVO1-HlTNQljr837a3CWTMzNkrVtaJVd_JabUJGAAje6bcHfVY5MWqBI3zLWFPUJsT1N5QkwjvCHe_5RfeuZK4gQEtPY4iBpvueRwertrQ0G02eg",
    features: ["Heat protectant", "Color sealing", "Silicone-free"]
  },
  {
    id: "ivory-lift-kit",
    name: "Ivory Lift Kit",
    description: "High-Lift Lightener. Professional grade bleach kit optimized to lift up to 8 levels while minimizing structural damage.",
    price: 29,
    category: "lightener",
    badge: "Pro Kit",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDITPZLpQWPlQT6RZjCONQFzi8avNal1A_BCkV7mtwLYJf2kSQ3Q81Wv3kEVaFR5Hz9muUPGvGbvvJK50mzhfa_-rKBgZz0ULgA7VjhjY18Avl6RWSF7c7Kigg89lHs_XH6yhe7-G4pvUPdZx8Ecum14tjPxx3lATHHGnsOhh37Pty1ehA1c0nhh84FofBLTEQYvnga2EFkAQQlefZRyAjms4FR5WKBH69b9vI9o8ZYVpTmxsgbG8Ep_PnFIl9oHMjqN9hPIe-1LR4",
    features: ["Lifts 8 levels", "Anti-breakage bond complex included", "Cream formula"]
  },
  {
    id: "sapphire-smoke-serum",
    name: "Sapphire Smoke Serum",
    description: "Deep Permanent Hue in a cool, smoky blue-black. Unapologetic expression through saturation.",
    price: 42,
    category: "permanent",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB6U0UgCGTdUBHlYSCZXSa21kf-O8t04oYgsEFzD08dI7cVQPvS7rVYWESDNqka3zZLw6urm--aMPKqSzE_cYNC4uki9UrY30NPBUjw25Nn82sx5RoEXNtmDCRPnawBIk9EkoxsJ3ZFmadoxBI9VGJQhSYmJmFQ-hsVzD-y6HOiNtYjLI3aYQSu0hOoK2u_dXHxW5qg7ETW4-ZTL5358a6wDAvTsi3N4RR-MggLe8kZrbmp0W34JfWFfHJZnWYTWE9IxgNQI9GY7M4",
    features: ["100% Vegan Formula", "Cool undertones", "Mirror shine"]
  },
  {
    id: "honey-nectar-gloss",
    name: "Honey Nectar Gloss",
    description: "Timeless Elegance. A brilliant gloss treatment that revives natural warmth and adds dimension to blondes and light brunettes.",
    price: 35,
    category: "demi-permanent",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCpcWDWGgWOynQGcDLIlQ34QG6QNBZ1wNXtqL-iGsfFG1lHGCS0exS9LqjKAGjXUOj1BEKH6igTfnUVwmjdAqSh3kzVaIYiv_r3vC2cEyMRaTPBmZsHKqOeJhafwBQOLB_67g1rdIRUf78g-tTlpQZcVLCEIlY-ZTAJ76f8gdgaxIN58nLGiCkEXL1n52QH-o5EJwa4zyEhrEYe1OKQliK469Ur0qbwvshHIcjbG0q55goAVbP-51A3iGFdevbnGgW5F76VhBs_hRE",
    features: ["Ammonia-free", "Blends grays", "Ultra conditioning"]
  }
];
