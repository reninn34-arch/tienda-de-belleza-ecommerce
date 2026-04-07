import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { Prisma } from "../../../lib/generated/prisma/client";
import { db } from "../../../lib/db";
import { sendError } from "../lib/errors";
import { logAdminAction } from "../lib/audit";

const router = Router();

const productBaseSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative().nullable().optional(),
  category: z.string().min(1).optional().default("general"),
  image: z.string().nullable().optional(),
  badge: z.string().nullable().optional(),
  stock: z.coerce.number().int().optional().default(0),
  features: z.array(z.string()).optional().default([]),
  gallery: z.array(z.string()).optional().default([]),
  swatches: z.array(z.unknown()).optional().default([]),
  reviews: z.array(z.unknown()).optional().default([]),
  highlights: z.array(z.unknown()).optional().default([]),
});

const productCreateSchema = productBaseSchema;

const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price: z.coerce.number().nonnegative().optional(),
  cost: z.coerce.number().nonnegative().nullable().optional(),
  category: z.string().min(1).optional(),
  image: z.string().nullable().optional(),
  badge: z.string().nullable().optional(),
  stock: z.coerce.number().int().optional(),
  features: z.array(z.string()).optional(),
  gallery: z.array(z.string()).optional(),
  swatches: z.array(z.unknown()).optional(),
  reviews: z.array(z.unknown()).optional(),
  highlights: z.array(z.unknown()).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "Se requiere al menos un campo" }
);

router.get("/", async (_req: Request, res: Response) => {
  const products = await db.product.findMany({ orderBy: { createdAt: "asc" } });
  res.json(products);
});

router.post("/", async (req: Request, res: Response) => {
  const parsed = productCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, {
      code: "VALIDATION_ERROR",
      message: "Payload inválido",
      details: parsed.error.flatten(),
    });
    return;
  }
  const body = parsed.data;
  const slug = body.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const id = body.id || slug || randomUUID();

  const product = await db.product.create({
    data: {
      id,
      name: body.name,
      description: body.description ?? null,
      price: body.price ?? 0,
      cost: body.cost ?? null,
      category: body.category ?? "general",
      image: body.image ?? null,
      badge: body.badge ?? null,
      stock: body.stock ?? 0,
      features: body.features ?? [],
      gallery: body.gallery ?? [],
      swatches: (body.swatches ?? []) as Prisma.JsonArray,
      reviews: (body.reviews ?? []) as Prisma.JsonArray,
      highlights: (body.highlights ?? []) as Prisma.JsonArray,
    },
  });
  await logAdminAction(req, {
    action: "product.create",
    entity: "product",
    entityId: product.id,
    details: { name: product.name, price: product.price, category: product.category },
  });
  res.status(201).json(product);
});

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = await db.product.findUnique({ where: { id } });
  if (!product) {
    sendError(res, 404, { code: "NOT_FOUND", message: "Not found" });
    return;
  }
  res.json(product);
});

router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = productUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, {
      code: "VALIDATION_ERROR",
      message: "Payload inválido",
      details: parsed.error.flatten(),
    });
    return;
  }
  const body = parsed.data;
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.price !== undefined) data.price = body.price;
  if (body.cost !== undefined) data.cost = body.cost;
  if (body.category !== undefined) data.category = body.category;
  if (body.image !== undefined) data.image = body.image;
  if (body.badge !== undefined) data.badge = body.badge;
  if (body.stock !== undefined) data.stock = body.stock;
  if (body.features !== undefined) data.features = body.features;
  if (body.gallery !== undefined) data.gallery = body.gallery;
  if (body.swatches !== undefined) data.swatches = body.swatches as Prisma.JsonArray;
  if (body.reviews !== undefined) data.reviews = body.reviews as Prisma.JsonArray;
  if (body.highlights !== undefined) data.highlights = body.highlights as Prisma.JsonArray;

  const product = await db.product.update({
    where: { id },
    data,
  });
  await logAdminAction(req, {
    action: "product.update",
    entity: "product",
    entityId: id,
    details: { fields: Object.keys(data) },
  });
  res.json(product);
});

router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.product.delete({ where: { id } });
  await logAdminAction(req, {
    action: "product.delete",
    entity: "product",
    entityId: id,
  });
  res.json({ success: true });
});

export default router;
