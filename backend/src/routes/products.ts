import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { Prisma } from "../../../lib/generated/prisma/client";
import { db } from "../../../lib/db";
import { sendError } from "../lib/errors";
import { logAdminAction } from "../lib/audit";
import { AuthenticatedRequest, requireAuth, requireRole } from "../middleware/auth";
import { posEventEmitter } from "../lib/events";
import * as fetch from "node-fetch";

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Calcula el stock total sumando todos los registros de Inventory del producto */
function calcTotalStock(
  inventories: { stock: number }[]
): number {
  return inventories.reduce((sum, inv) => sum + inv.stock, 0);
}

/** Include clause estándar para traer inventarios con datos de la sucursal */
const inventoryInclude = {
  inventories: {
    include: { branch: true },
    orderBy: { branch: { name: "asc" as const } },
  },
} satisfies Prisma.ProductInclude;

/** Schema para los inventarios que llegan desde el admin */
const inventorySchema = z.array(
  z.object({
    branchId: z.string().min(1),
    stock: z.coerce.number().int().min(0),
  })
).optional();

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const productBaseSchema = z.object({
  id: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative().nullable().optional(),
  category: z.string().min(1).optional().default("general"),
  image: z.string().nullable().optional(),
  badge: z.string().nullable().optional(),
  features: z.array(z.string()).optional().default([]),
  gallery: z.array(z.string()).optional().default([]),
  swatches: z.array(z.unknown()).optional().default([]),
  reviews: z.array(z.unknown()).optional().default([]),
  highlights: z.array(z.unknown()).optional().default([]),
  details: z.string().nullable().optional(),
  howToUse: z.string().nullable().optional(),
  shippingInfo: z.string().nullable().optional(),
  highlightsLabel: z.string().nullable().optional(),
  highlightsTitle: z.string().nullable().optional(),
  scienceTitle: z.string().nullable().optional(),
  scienceDesc: z.string().nullable().optional(),
  scienceItems: z.array(z.unknown()).optional().default([]),
  minStock: z.coerce.number().int().nonnegative().optional().default(5),
  /** Array de inventarios por sucursal  */
  inventories: inventorySchema,
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
  minStock: z.coerce.number().int().nonnegative().optional().default(5),
  features: z.array(z.string()).optional(),
  gallery: z.array(z.string()).optional(),
  swatches: z.array(z.unknown()).optional(),
  reviews: z.array(z.unknown()).optional(),
  highlights: z.array(z.unknown()).optional(),
  details: z.string().nullable().optional(),
  howToUse: z.string().nullable().optional(),
  shippingInfo: z.string().nullable().optional(),
  highlightsLabel: z.string().nullable().optional(),
  highlightsTitle: z.string().nullable().optional(),
  scienceTitle: z.string().nullable().optional(),
  scienceDesc: z.string().nullable().optional(),
  scienceItems: z.array(z.unknown()).optional(),
  inventories: inventorySchema,
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "Se requiere al menos un campo" }
);

// ─── GET all products ────────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const { category, maxPrice, sort, page, limit } = req.query;
    const isFiltered = category || maxPrice || sort || page || limit;

    const authReq = req as AuthenticatedRequest;
    
    // Si no hay filtros (vista lista/admin)
    if (!isFiltered) {
      const include: any = {
        inventories: {
          include: { branch: true },
          orderBy: { branch: { name: "asc" as const } },
        },
      };

      // Si es VENDEDOR, solo incluimos el inventario de su sucursal
      if (authReq.user?.role === "VENDEDOR" && authReq.user.branchId) {
        include.inventories.where = { branchId: authReq.user.branchId };
      }

      const products = await db.product.findMany({
        orderBy: { createdAt: "asc" },
        include,
      });
      res.json(
        products.map((p: any) => ({ ...p, totalStock: calcTotalStock(p.inventories || []) }))
      );
      return;
    }

    // ── Filtrado con paginación (tienda o admin filtrado) ──────────────────────
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 12));
    const skip = (pageNum - 1) * limitNum;

    const queryInclude: any = {
      inventories: {
        include: { branch: true },
        orderBy: { branch: { name: "asc" as const } },
      },
    };

    if (authReq.user?.role === "VENDEDOR" && authReq.user.branchId) {
      queryInclude.inventories.where = { branchId: authReq.user.branchId };
    }

    const where: Record<string, unknown> = {};
    if (typeof category === "string" && category) where.category = category;
    if (typeof maxPrice === "string" && maxPrice) where.price = { lte: Number(maxPrice) };

    let orderBy: Record<string, string> = { createdAt: "desc" };
    if (sort === "price-asc") orderBy = { price: "asc" };
    else if (sort === "price-desc") orderBy = { price: "desc" };
    else if (sort === "name") orderBy = { name: "asc" };

    const [products, totalItems] = await Promise.all([
      db.product.findMany({ where, orderBy, skip, take: limitNum, include: queryInclude }),
      db.product.count({ where }),
    ]);

    res.json({
      products: products.map((p: any) => ({ ...p, totalStock: calcTotalStock(p.inventories || []) })),
      totalItems,
      totalPages: Math.ceil(totalItems / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    sendError(res, 500, { code: "INTERNAL_ERROR", message: "Error interno", details: error instanceof Error ? error.message : error });
  }
});

// ─── POST create product ─────────────────────────────────────────────────────

router.post("/", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const parsed = productCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, { code: "VALIDATION_ERROR", message: "Payload inválido", details: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const id = body.id || slug || randomUUID();

    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          id,
          name: body.name,
          description: body.description ?? null,
          price: body.price ?? 0,
          cost: body.cost ?? null,
          category: body.category ?? "general",
          image: body.image ?? null,
          badge: body.badge ?? null,
          minStock: body.minStock ?? 5,
          features: body.features ?? [],
          gallery: body.gallery ?? [],
          swatches: (body.swatches ?? []) as Prisma.JsonArray,
          reviews: (body.reviews ?? []) as Prisma.JsonArray,
          highlights: (body.highlights ?? []) as Prisma.JsonArray,
          details: body.details ?? null,
          howToUse: body.howToUse ?? null,
          shippingInfo: body.shippingInfo ?? null,
          highlightsLabel: body.highlightsLabel ?? null,
          highlightsTitle: body.highlightsTitle ?? null,
          scienceTitle: body.scienceTitle ?? null,
          scienceDesc: body.scienceDesc ?? null,
          scienceItems: (body.scienceItems ?? []) as Prisma.JsonArray,
        },
      });

      // Crear/actualizar inventario por sucursal si se enviaron
      if (body.inventories?.length) {
        for (const inv of body.inventories) {
          await tx.inventory.upsert({
            where: { productId_branchId: { productId: id, branchId: inv.branchId } },
            update: { stock: inv.stock },
            create: { productId: id, branchId: inv.branchId, stock: inv.stock },
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: inventoryInclude,
      });
    });

    await logAdminAction(req, {
      action: "product.create",
      entity: "product",
      entityId: product.id,
      details: { name: product.name, price: product.price, category: product.category },
    });

    posEventEmitter.emit("pos_update");
    // Revalidate cache for catalog and product
    try {
      const secret = process.env.REVALIDATE_SECRET || "blush-revalidate-secret-2026";
      const storeUrl = process.env.STORE_URL || "http://localhost:3000";
      // Catalog
      await fetch.default(`${storeUrl}/api/revalidate?secret=${secret}&tag=catalogo`, { method: "POST" });
      // Product
      await fetch.default(`${storeUrl}/api/revalidate?secret=${secret}&tag=producto-${product.id}`, { method: "POST" });
    } catch (e) { /* ignore */ }
    res.status(201).json({ ...product, totalStock: calcTotalStock(product.inventories) });
  } catch (error) {
    sendError(res, 500, { code: "INTERNAL_ERROR", message: "Error interno", details: error instanceof Error ? error.message : error });
  }
});

// ─── GET product by ID ───────────────────────────────────────────────────────

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await db.product.findUnique({
      where: { id },
      include: inventoryInclude,
    });
    if (!product) {
      sendError(res, 404, { code: "NOT_FOUND", message: "Not found" });
      return;
    }
    res.json({ ...product, totalStock: calcTotalStock(product.inventories) });
  } catch (error) {
    sendError(res, 500, { code: "INTERNAL_ERROR", message: "Error interno", details: error instanceof Error ? error.message : error });
  }
});

// ─── PUT update product ──────────────────────────────────────────────────────

router.put("/:id", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = productUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, { code: "VALIDATION_ERROR", message: "Payload inválido", details: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;

    const product = await db.$transaction(async (tx) => {
      // Actualizar campos base del producto
      const data: Record<string, unknown> = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.description !== undefined) data.description = body.description;
      if (body.price !== undefined) data.price = body.price;
      if (body.cost !== undefined) data.cost = body.cost;
      if (body.category !== undefined) data.category = body.category;
      if (body.image !== undefined) data.image = body.image;
      if (body.badge !== undefined) data.badge = body.badge;
      if (body.features !== undefined) data.features = body.features;
      if (body.gallery !== undefined) data.gallery = body.gallery;
      if (body.swatches !== undefined) data.swatches = body.swatches as Prisma.JsonArray;
      if (body.reviews !== undefined) data.reviews = body.reviews as Prisma.JsonArray;
      if (body.highlights !== undefined) data.highlights = body.highlights as Prisma.JsonArray;
      if (body.details !== undefined) data.details = body.details;
      if (body.howToUse !== undefined) data.howToUse = body.howToUse;
      if (body.shippingInfo !== undefined) data.shippingInfo = body.shippingInfo;
      if (body.highlightsLabel !== undefined) data.highlightsLabel = body.highlightsLabel;
      if (body.highlightsTitle !== undefined) data.highlightsTitle = body.highlightsTitle;
      if (body.scienceTitle !== undefined) data.scienceTitle = body.scienceTitle;
      if (body.scienceDesc !== undefined) data.scienceDesc = body.scienceDesc;
      if (body.scienceItems !== undefined) data.scienceItems = body.scienceItems as Prisma.JsonArray;

      if (Object.keys(data).length > 0) {
        await tx.product.update({ where: { id }, data });
      }

      // Upsert inventario por sucursal
      if (body.inventories?.length) {
        for (const inv of body.inventories) {
          await tx.inventory.upsert({
            where: { productId_branchId: { productId: id, branchId: inv.branchId } },
            update: { stock: inv.stock },
            create: { productId: id, branchId: inv.branchId, stock: inv.stock },
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: inventoryInclude,
      });
    });

    await logAdminAction(req, {
      action: "product.update",
      entity: "product",
      entityId: id,
      details: { fields: Object.keys(body) },
    });

    posEventEmitter.emit("pos_update");
    // Revalidate cache for catalog and product
    try {
      const secret = process.env.REVALIDATE_SECRET || "blush-revalidate-secret-2026";
      const storeUrl = process.env.STORE_URL || "http://localhost:3000";
      // Catalog
      await fetch.default(`${storeUrl}/api/revalidate?secret=${secret}&tag=catalogo`, { method: "POST" });
      // Product
      await fetch.default(`${storeUrl}/api/revalidate?secret=${secret}&tag=producto-${id}`, { method: "POST" });
    } catch (e) { /* ignore */ }
    res.json({ ...product, totalStock: calcTotalStock(product.inventories) });
  } catch (error) {
    sendError(res, 500, { code: "INTERNAL_ERROR", message: "Error interno", details: error instanceof Error ? error.message : error });
  }
});

// ─── DELETE product ──────────────────────────────────────────────────────────

router.delete("/:id", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // onDelete: Cascade en Inventory eliminará los registros relacionados automáticamente
    await db.product.delete({ where: { id } });
    await logAdminAction(req, {
      action: "product.delete",
      entity: "product",
      entityId: id,
    });
    posEventEmitter.emit("pos_update");
    // Revalidate cache for catalog and product
    try {
      const secret = process.env.REVALIDATE_SECRET || "blush-revalidate-secret-2026";
      const storeUrl = process.env.STORE_URL || "http://localhost:3000";
      // Catalog
      await fetch.default(`${storeUrl}/api/revalidate?secret=${secret}&tag=catalogo`, { method: "POST" });
      // Product
      await fetch.default(`${storeUrl}/api/revalidate?secret=${secret}&tag=producto-${id}`, { method: "POST" });
    } catch (e) { /* ignore */ }
    res.json({ success: true });
  } catch (error) {
    sendError(res, 500, { code: "INTERNAL_ERROR", message: "Error interno", details: error instanceof Error ? error.message : error });
  }
});

export default router;
