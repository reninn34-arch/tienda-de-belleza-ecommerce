import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { db } from "../lib/db";

function readJson<T>(file: string): T {
  try {
    const raw = readFileSync(join(process.cwd(), "data", file), "utf-8").replace(/^\uFEFF/, "");
    return JSON.parse(raw) as T;
  } catch {
    return (Array.isArray([]) ? [] : {}) as T;
  }
}

interface RawProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  category: string;
  image?: string;
  badge?: string;
  stock?: number;
  features?: string[];
  gallery?: string[];
  swatches?: unknown[];
  reviews?: unknown[];
  highlights?: unknown[];
}

interface RawOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface RawOrder {
  id: string;
  customer: string;
  email: string;
  total: number;
  subtotal?: number;
  shipping?: number;
  tax?: number;
  status?: string;
  shippingMethod?: string;
  paymentMethod?: string;
  address?: string;
  notes?: string;
  date?: string;
  products?: RawOrderItem[];
}

interface RawPage {
  id: string;
  title: string;
  slug: string;
  blocks?: unknown[];
  published?: boolean;
}

async function main() {
  console.log("🌱 Seeding database...");

  const products = readJson<RawProduct[]>("products.json");
  for (const p of products) {
    await db.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        price: p.price,
        cost: p.cost ?? null,
        category: p.category,
        image: p.image ?? null,
        badge: p.badge ?? null,
        stock: p.stock ?? 0,
        features: (p.features ?? []) as any[],
        gallery: (p.gallery ?? []) as any[],
        swatches: (p.swatches ?? []) as any[],
        reviews: (p.reviews ?? []) as any[],
        highlights: (p.highlights ?? []) as any[],
      },
    });
  }
  console.log(`  ✔ ${products.length} products`);

  const orders = readJson<RawOrder[]>("orders.json");
  for (const o of orders) {
    await db.order.upsert({
      where: { id: o.id },
      update: {},
      create: {
        id: o.id,
        customer: o.customer,
        email: o.email,
        total: o.total,
        subtotal: o.subtotal ?? o.total,
        shipping: o.shipping ?? 0,
        tax: o.tax ?? 0,
        status: o.status ?? "pending",
        shippingMethod: o.shippingMethod ?? null,
        paymentMethod: o.paymentMethod ?? null,
        address: o.address ?? null,
        notes: o.notes ?? null,
        date: o.date ? new Date(o.date) : new Date(),
        items: {
          create: (o.products ?? []).map((item) => ({
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
    });
  }
  console.log(`  ✔ ${orders.length} orders`);

  const settings = readJson<Record<string, unknown>>("settings.json");
  await db.settings.upsert({
    where: { id: 1 },
    update: { data: settings as any },
    create: { id: 1, data: settings as any },
  });
  console.log("  ✔ settings");

  const pages = readJson<RawPage[]>("pages.json");
  for (const page of pages) {
    await db.page.upsert({
      where: { id: page.id },
      update: {},
      create: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        blocks: (page.blocks ?? []) as any[],
        published: page.published ?? false,
      },
    });
  }
  console.log(`  ✔ ${pages.length} pages`);

  const tutorials = readJson<Record<string, unknown>>("tutorials.json");        
  await db.tutorials.upsert({
    where: { id: 1 },
    update: { data: tutorials as any },
    create: { id: 1, data: tutorials as any },
  });
  console.log("  ✔ tutorials");

  await db.admin.upsert({
    where: { email: "admin@blush.com" },
    update: {},
    create: {
      email: "admin@blush.com",
      password: "blush2024", // Use bcrypt in prod
      name: "Administrador",
    },
  });
  console.log("  ✔ default admin (admin@blush.com)");

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
