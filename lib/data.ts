import { Product, Slide, CollectionsPage, Collection, CuratedPage, Page, TutorialsData, HomeContent, FooterContent } from "./types";
import { cache } from "react";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

// cache() deduplica llamadas dentro del mismo render pass de Next.js.
// Sin esto, layout + page + navbar + footer cada uno hacía su propio fetch.
// Con cache(), TODAS comparten el mismo resultado de una sola llamada al backend.
const getSettings = cache(async (): Promise<Record<string, unknown>> => {
  try {
    const res = await fetch(`${BACKEND}/api/settings`, {
      next: { tags: ["settings"], revalidate: 3600 }, // 1 hour for general settings
    });
    return res.json() as Promise<Record<string, unknown>>;
  } catch {
    return {};
  }
});

export async function getStoreName(): Promise<string> {
  const s = await getSettings();
  return (s?.storeName as string) ?? "The Editorial Alchemist";
}

export async function getBranding(): Promise<{ logoUrl: string; faviconUrl: string; brandColor?: string }> {
  const s = await getSettings();
  return (s?.branding as { logoUrl: string; faviconUrl: string; brandColor?: string }) ?? { logoUrl: "", faviconUrl: "" };
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
      next: { tags: ["producto-" + id], revalidate: 60 }, // 1 minute for individual products
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
      next: { tags: ["catalogo"], revalidate: 300 }, // 5 minutes for the general catalog
    });
    return res.json() as Promise<Product[]>;
  } catch {
    return [];
  }
}

export interface FilteredProductsResult {
  products: Product[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

export async function getFilteredProducts({
  category,
  maxPrice,
  sort = "featured",
  page = 1,
  limit = 12,
}: {
  category?: string;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<FilteredProductsResult> {
  try {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (maxPrice !== undefined) params.set("maxPrice", String(maxPrice));
    if (sort) params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(limit));

    const res = await fetch(`${BACKEND}/api/products?${params.toString()}`, {
      next: { tags: ["catalogo"], revalidate: 0 }, // Tag for filtered catalog
    });
    if (!res.ok) throw new Error("Backend error");
    return res.json() as Promise<FilteredProductsResult>;
  } catch {
    return { products: [], totalPages: 1, currentPage: page, totalItems: 0 };
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

// Seed reference products removed per cleanup
