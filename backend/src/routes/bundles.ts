import { Router, Request, Response } from "express";
import { db } from "../../../lib/db";
import { z } from "zod";
import { sendError } from "../lib/errors";
import { logAdminAction } from "../lib/audit";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calcula el stock disponible de un bundle en todas las sucursales.
 * El stock de un bundle = Math.min(inventario_componente / cantidad_requerida)
 * devuelve el mínimo entre sucursales (o solo para la sucursal pedida).
 */
import { computeBundleStock } from "../lib/stock";

// ─── Esquema de validación ────────────────────────────────────────────────────

const BundleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
});

const BundleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price: z.number().positive(),
  image: z.string().optional().nullable(),
  active: z.boolean().optional(),
  branchIds: z.array(z.string()).optional(),
  customStockLimit: z.number().int().nonnegative().optional().nullable(),
  taxRate: z.number().nonnegative().optional(),
  items: z.array(BundleItemSchema).min(1),
});

// ─── GET /api/admin/bundles ───────────────────────────────────────────────────

router.get("/", async (_req: Request, res: Response) => {
  const bundles = await db.bundle.findMany({
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              image: true,
              price: true,
              cost: true,
              inventories: { select: { stock: true, branchId: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calcular stock dinámico y precio individual para cada bundle
  const result = await Promise.all(
    bundles.map(async (b) => {
      const stockDisponible = await computeBundleStock(b.id);
      const precioIndividual = b.items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
      const costoTotal = b.items.reduce(
        (sum, item) => sum + (item.product.cost || 0) * item.quantity,
        0
      );
      const ahorro = precioIndividual - b.price;
      const ahorroPercent =
        precioIndividual > 0
          ? Math.round((ahorro / precioIndividual) * 100)
          : 0;
      return {
        ...b,
        stockDisponible,
        precioIndividual,
        costoTotal,
        ahorro,
        ahorroPercent,
      };
    })
  );

  res.json(result);
});

// ─── GET /api/admin/bundles/:id ───────────────────────────────────────────────

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const bundle = await db.bundle.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              image: true,
              price: true,
              cost: true,
              inventories: { select: { stock: true, branchId: true } },
            },
          },
        },
      },
    },
  });
  if (!bundle) return sendError(res, 404, { code: "NOT_FOUND", message: "Bundle no encontrado" });

  const stockDisponible = await computeBundleStock(id);
  const precioIndividual = bundle.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const costoTotal = bundle.items.reduce(
    (sum, item) => sum + (item.product.cost || 0) * item.quantity,
    0
  );
  res.json({
    ...bundle,
    stockDisponible,
    precioIndividual,
    costoTotal,
    ahorro: precioIndividual - bundle.price,
    ahorroPercent:
      precioIndividual > 0
        ? Math.round(((precioIndividual - bundle.price) / precioIndividual) * 100)
        : 0,
  });
});

// ─── POST /api/admin/bundles ──────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  const parsed = BundleSchema.safeParse(req.body);
  if (!parsed.success)
    return sendError(res, 400, { code: "VALIDATION_ERROR", message: "Datos inválidos", details: parsed.error });

  const { name, description, price, image, active, items, branchIds, customStockLimit, taxRate } = parsed.data;

  const bundle = await db.bundle.create({
    data: {
      name,
      description,
      price,
      image,
      active: active ?? true,
      taxRate: taxRate ?? 0,
      branchIds: branchIds ?? [],
      customStockLimit,
      items: { create: items },
    },
    include: { items: { include: { product: { select: { name: true, image: true, price: true } } } } },
  });

  await logAdminAction(req, {
    action: "bundle.create",
    entity: "bundle",
    entityId: bundle.id,
    details: { name: bundle.name, price: bundle.price },
  });

  res.status(201).json(bundle);
});

// ─── PUT /api/admin/bundles/:id ───────────────────────────────────────────────

router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = BundleSchema.safeParse(req.body);
  if (!parsed.success)
    return sendError(res, 400, { code: "VALIDATION_ERROR", message: "Datos inválidos", details: parsed.error });

  const { name, description, price, image, active, items, branchIds, customStockLimit, taxRate } = parsed.data;

  const existing = await db.bundle.findUnique({ where: { id } });
  if (!existing)
    return sendError(res, 404, { code: "NOT_FOUND", message: "Bundle no encontrado" });

  // Transacción: eliminar ítems viejos, re-crear los nuevos, actualizar bundle
  const updated = await db.$transaction(async (tx) => {
    await tx.bundleItem.deleteMany({ where: { bundleId: id } });
    return tx.bundle.update({
      where: { id },
      data: {
        name,
        description,
        price,
        image,
        active: active ?? true,
        taxRate: taxRate ?? 0,
        branchIds: branchIds ?? [],
        customStockLimit,
        items: { create: items },
      },
      include: { items: { include: { product: { select: { name: true, image: true, price: true } } } } },
    });
  });

  await logAdminAction(req, {
    action: "bundle.update",
    entity: "bundle",
    entityId: id,
    details: { name: updated.name, price: updated.price },
  });

  res.json(updated);
});

// ─── DELETE /api/admin/bundles/:id ───────────────────────────────────────────

router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await db.bundle.findUnique({ where: { id } });
  if (!existing)
    return sendError(res, 404, { code: "NOT_FOUND", message: "Bundle no encontrado" });

  await db.bundle.delete({ where: { id } }); // cascade elimina BundleItems

  await logAdminAction(req, {
    action: "bundle.delete",
    entity: "bundle",
    entityId: id,
    details: { name: existing.name },
  });

  res.json({ success: true });
});

export default router;
