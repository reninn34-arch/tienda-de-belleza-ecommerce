import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../../../lib/db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const products = await db.product.findMany({ orderBy: { createdAt: "asc" } });
  res.json(products);
});

router.post("/", async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const slug = typeof body.name === "string"
    ? body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    : randomUUID();
  const id = (body.id as string | undefined) || slug;

  const product = await db.product.create({
    data: {
      id,
      name: body.name as string,
      description: (body.description as string | null) ?? null,
      price: (body.price as number) ?? 0,
      cost: (body.cost as number | null) ?? null,
      category: (body.category as string) ?? "general",
      image: (body.image as string | null) ?? null,
      badge: (body.badge as string | null) ?? null,
      stock: (body.stock as number) ?? 0,
      features: (body.features as any[]) ?? [],
      gallery: (body.gallery as any[]) ?? [],
      swatches: (body.swatches as any[]) ?? [],
      reviews: (body.reviews as any[]) ?? [],
      highlights: (body.highlights as any[]) ?? [],
    },
  });
  res.status(201).json(product);
});

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = await db.product.findUnique({ where: { id } });
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  res.json(product);
});

router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;
  const product = await db.product.update({
    where: { id },
    data: {
      name: body.name as string,
      description: (body.description as string | null) ?? null,
      price: body.price as number,
      cost: (body.cost as number | null) ?? null,
      category: body.category as string,
      image: (body.image as string | null) ?? null,
      badge: (body.badge as string | null) ?? null,
      stock: (body.stock as number) ?? 0,
      features: (body.features as any[]) ?? [],
      gallery: (body.gallery as any[]) ?? [],
      swatches: (body.swatches as any[]) ?? [],
      reviews: (body.reviews as any[]) ?? [],
      highlights: (body.highlights as any[]) ?? [],
    },
  });
  res.json(product);
});

router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.product.delete({ where: { id } });
  res.json({ success: true });
});

export default router;
