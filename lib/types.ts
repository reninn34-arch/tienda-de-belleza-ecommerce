export interface ProductSwatch {
  color: string;
  label: string;
}

export interface ProductReview {
  title: string;
  text: string;
  author: string;
  stars: number;
}

export interface Branch {
  id: string;
  name: string;
  address?: string | null;
  createdAt?: string;
}

export interface InventoryItem {
  id: number;
  productId: string;
  branchId: string;
  stock: number;
  branch: Branch;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  /** Stock total calculado (suma de todos los Inventory) */
  totalStock?: number;
  /** Inventario desglosado por sucursal */
  inventories?: InventoryItem[];
  cost?: number;
  sku?: string;
  badge?: string;
  features?: string[];
  gallery?: string[];
  swatches?: ProductSwatch[];
  reviews?: ProductReview[];
  details?: string;
  howToUse?: string;
  shippingInfo?: string;
  highlights?: { icon: string; title: string; desc: string }[];
  highlightsLabel?: string;
  highlightsTitle?: string;
  scienceTitle?: string;
  scienceDesc?: string;
  scienceItems?: { icon: string; title: string; desc: string }[];
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Slide {
  id: string;
  image: string;
  label: string;
  title: string;
  titleHighlight: string;
  description: string;
  cta1Text: string;
  cta1Link: string;
  cta2Text: string;
  cta2Link: string;
}

export interface Collection {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  productIds: string[];
}

export interface CollectionsPage {
  hero: { image: string; label: string; title: string };
  intro: { heading: string; body: string };
  collections: Collection[];
  ctaBanner: { label: string; title: string; body: string; buttonText: string; buttonLink: string };
}

export interface CuratedPage {
  hero: { label: string; title: string; subtitle: string };
  productIds: string[];
}

export interface Tutorial {
  id: string;
  image: string;
  level: string;
  duration: string;
  title: string;
  desc: string;
}

export interface FaqItem {
  id: string;
  q: string;
  a: string;
}

export interface TutorialsData {
  videos: Tutorial[];
  faq: FaqItem[];
}

export interface HomeStat { value: string; label: string; }

export interface HomeContent {
  tendencias: {
    label: string; title: string; description: string; linkText: string; linkHref: string;
  };
  transformacion: {
    label: string; title: string;
    beforeImage: string; afterImage: string; afterLabel: string;
    quote: string; authorName: string; authorRole: string; authorImage: string;
    stats: HomeStat[];
  };
  seleccion: {
    label: string; title: string; linkText: string; linkHref: string;
  };
  newsletter: {
    enabled?: boolean;
    label: string; title: string; description: string;
    formType?: "email" | "contact";
    buttonText?: string;
  };
  ventaja?: {
    label: string; title: string;
    items: { icon: string; title: string; desc: string }[];
  };
}

export interface FooterLink { label: string; href: string; }

export interface FooterColumn { title: string; links: FooterLink[]; }

export interface FooterContent {
  brandName: string;
  brandDesc: string;
  copyright: string;
  tagline: string;
  columns: FooterColumn[];
}

export interface PageBlock {
  id: string;
  type: "text" | "banner" | "products";
  // text
  content?: string;
  // banner
  image?: string;
  label?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  // products
  productIds?: string[];
  sectionTitle?: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  blocks: PageBlock[];
  published: boolean;
  createdAt: string;
}
