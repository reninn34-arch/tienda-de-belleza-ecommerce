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

// Extra helper for bundle stock calculation
import { computeBundleStock } from "../lib/stock";
const ONLINE_BRANCH_NAME = "tienda-online";

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
  taxRate: z.coerce.number().nonnegative().optional().default(0),
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
  taxRate: z.coerce.number().nonnegative().optional().default(0),
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

    // ── GET all products (Mergueando Bundles en memoria) ─────────────────────
    const include: any = {
      inventories: {
        include: { branch: true },
        orderBy: { branch: { name: "asc" as const } },
      },
    };

    if (authReq.user?.role === "VENDEDOR" && authReq.user.branchId) {
      include.inventories.where = { branchId: authReq.user.branchId };
    }

    // 1. Fetch DB Products
    const dbProductsRaw = await db.product.findMany({ include });

    // Determine the branch context for stock (Re-using logic for consistency)
    const onlineBranch = await db.branch.findUnique({ where: { name: ONLINE_BRANCH_NAME } });
    let contextBranchId: string | undefined = undefined;
    if (authReq.user?.role === "VENDEDOR" && authReq.user.branchId) {
      contextBranchId = authReq.user.branchId;
    } else {
      contextBranchId = onlineBranch?.id;
    }

    const dbProducts = dbProductsRaw.map((p: any) => {
      // Filter inventories by context if applicable
      const inventoriesForContext = contextBranchId
        ? p.inventories.filter((inv: any) => inv.branchId === contextBranchId)
        : p.inventories;

      const totalStock = calcTotalStock(inventoriesForContext || []);
      return {
        ...p,
        totalStock,
        stock: totalStock, // Ensure both fields are set
      };
    });

    // 2. Fetch DB Bundles and map as Products
    const dbBundlesRaw = await db.bundle.findMany({ include: { items: true } });

    const dbBundles = await Promise.all(
      dbBundlesRaw.filter(b => b.active).map(async (b) => {
        const stock = await computeBundleStock(b.id, contextBranchId);
        return {
          id: b.id,
          name: b.name,
          description: b.description,
          price: b.price,
          cost: 0,
          category: "Kits", // Mágico: Se asigna a Kits
          image: b.image,
          badge: "Kit",
          features: [],
          gallery: [],
          swatches: [],
          reviews: [],
          highlights: [],
          details: null,
          howToUse: null,
          shippingInfo: null,
          highlightsLabel: null,
          highlightsTitle: null,
          scienceTitle: null,
          scienceDesc: null,
          scienceItems: [],
          minStock: 0,
          taxRate: b.taxRate ?? 0,   // ← IVA propio del kit
          inventories: [],
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
          totalStock: stock,
          stock: stock,
          isBundle: true,
        };
      })
    );

    // 3. Combine
    let allItems = [...dbProducts, ...dbBundles];

    // Si no hay filtros, retorna todo (usado por data.ts getAllProducts)
    if (!isFiltered) {
      // Orden genérico por creación
      allItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      res.json(allItems);
      return;
    }

    // 4. Apply Filters in Memory
    if (typeof category === "string" && category) {
      allItems = allItems.filter((item) => item.category === category);
    }
    if (typeof maxPrice === "string" && maxPrice) {
      allItems = allItems.filter((item) => item.price <= Number(maxPrice));
    }

    // 5. Sort In Memory
    if (sort === "price-asc") {
      allItems.sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
      allItems.sort((a, b) => b.price - a.price);
    } else if (sort === "name") {
      allItems.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // 6. Paginate In Memory
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 12));
    const skip = (pageNum - 1) * limitNum;

    const paginatedItems = allItems.slice(skip, skip + limitNum);
    const totalItems = allItems.length;

    res.json({
      products: paginatedItems,
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
          taxRate: body.taxRate ?? 0,
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
      // ── Check if it's a Bundle
      const bundle = await db.bundle.findUnique({
        where: { id },
        include: { items: { include: { product: { include: { inventories: true } } } } }
      });
      if (bundle) {
        let contextBranchId: string | undefined = undefined;
        // Check if we have an authenticated user with a specific branch
        const authReq = req as AuthenticatedRequest;
        if (authReq.user?.role === "VENDEDOR" && authReq.user.branchId) {
          contextBranchId = authReq.user.branchId;
        } else {
          // Default to online branch for storefront
          const onlineBranch = await db.branch.findUnique({ where: { name: ONLINE_BRANCH_NAME } });
          contextBranchId = onlineBranch?.id;
        }

        const stock = await computeBundleStock(bundle.id, contextBranchId);
        res.json({
          id: bundle.id,
          name: bundle.name,
          description: bundle.description,
          price: bundle.price,
          cost: 0,
          category: "Kits",
          image: bundle.image,
          badge: "Kit",
          features: [],
          gallery: [],
          swatches: [],
          reviews: [],
          highlights: [],
          details: null,
          howToUse: null,
          shippingInfo: null,
          highlightsLabel: null,
          highlightsTitle: null,
          scienceTitle: null,
          scienceDesc: null,
          scienceItems: [],
          minStock: 0,
          inventories: [],
          createdAt: bundle.createdAt,
          updatedAt: bundle.updatedAt,
          totalStock: stock,
          stock: stock, // Populating stock for frontend
          isBundle: true,
        });
        return;
      }
      sendError(res, 404, { code: "NOT_FOUND", message: "Not found" });
      return;
    }

    // Determine context branch
    let contextBranchId: string | undefined = undefined;
    const authReq = req as AuthenticatedRequest;
    if (authReq.user?.role === "VENDEDOR" && authReq.user.branchId) {
      contextBranchId = authReq.user.branchId;
    } else {
      const onlineBranch = await db.branch.findUnique({ where: { name: ONLINE_BRANCH_NAME } });
      contextBranchId = onlineBranch?.id;
    }

    const inventoriesForContext = contextBranchId
      ? product.inventories.filter((inv: any) => inv.branchId === contextBranchId)
      : product.inventories;

    const totalStock = calcTotalStock(inventoriesForContext);

    res.json({
      ...product,
      totalStock,
      stock: totalStock
    });
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
      if (body.taxRate !== undefined) data.taxRate = body.taxRate;

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
