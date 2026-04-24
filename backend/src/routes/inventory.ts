import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../../../lib/db";
import { sendError } from "../lib/errors";
import { logAdminAction } from "../lib/audit";
import { requireAuth, requireRole } from "../middleware/auth";
import { posEventEmitter } from "../lib/events";
import { computeBundleStock } from "../lib/stock";

const router = Router();

// ─── GET /api/inventory ──────────────────────────────────────────────────────
// Returns a unified list of Products and Bundles for inventory management.
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const products = await db.product.findMany({
      include: {
        inventories: { include: { branch: true } }
      }
    });

    const bundles = await db.bundle.findMany({
      include: { items: true }
    });

    const bundlesRaw = await db.bundle.findMany({
      include: { items: { include: { product: true } } }
    });

    const branches = await db.branch.findMany({ select: { id: true } });

    const enhancedBundles = await Promise.all(
      bundlesRaw.map(async b => {
        const branchStock: Record<string, number> = {};
        for (const branch of branches) {
          branchStock[branch.id] = await computeBundleStock(b.id, branch.id);
        }

        const costoTotal = b.items.reduce(
          (sum, item) => sum + (item.product.cost || 0) * item.quantity,
          0
        );

        return {
          ...b,
          isBundle: true,
          branchStock,
          costoTotal,
        };
      })
    );

    res.json({
      products,
      bundles: enhancedBundles
    });
  } catch (error) {
    sendError(res, 500, { code: "INTERNAL_ERROR", message: "Error al obtener inventario", details: error });
  }
});

// Zod schema for bulk inventory updates
const bulkUpdateSchema = z.object({
  updates: z.array(
    z.object({
      productId: z.string().optional(),
      bundleId: z.string().optional(),
      branchId: z.string().min(1),
      stock: z.coerce.number().int().nonnegative().optional(),
      minStock: z.coerce.number().int().nonnegative().optional(),
      customStockLimit: z.coerce.number().int().nonnegative().optional().nullable(),
    })
  ).min(1, "Debe enviar al menos una actualización"),
});

// ─── POST /api/inventory/bulk ────────────────────────────────────────────────
// Permite actualizar el stock de múltiples productos en múltiples sucursales a la vez.
// Utiliza db.$transaction para asegurar atomicity.
// Este endpoint es perfecto para el Módulo de Inventario.

// Solo ADMIN puede hacer bulk update de inventario
router.post("/bulk", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const parsed = bulkUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, {
        code: "VALIDATION_ERROR",
        message: "Payload inválido",
        details: parsed.error.flatten(),
      });
      return;
    }

    const { updates } = parsed.data;

    // Ejecutar todas las actualizaciones en una transacción
    await db.$transaction(
      updates.flatMap(({ productId, bundleId, branchId, stock, minStock, customStockLimit }) => {
        const ops = [];

        // Product Logic
        if (productId) {
          if (stock !== undefined) {
            ops.push(db.inventory.upsert({
              where: { productId_branchId: { productId, branchId } },
              update: { stock },
              create: { productId, branchId, stock },
            }));
          }
          if (minStock !== undefined) {
            ops.push(db.product.update({
              where: { id: productId },
              data: { minStock }
            }));
          }
        }

        // Bundle Logic
        if (bundleId) {
          if (customStockLimit !== undefined) {
            ops.push(db.bundle.update({
              where: { id: bundleId },
              data: { customStockLimit }
            }));
          }
        }

        return ops;
      })
    );

    // Logging the bulk action
    await logAdminAction(req, {
      action: "inventory.bulk_update",
      entity: "inventory",
      details: { updatedCount: updates.length, updates },
    });

    // Avisar a todas las pantallas de POS que hay nuevo stock
    posEventEmitter.emit("pos_update");
    res.json({ success: true, updatedCount: updates.length });
  } catch (error) {
    sendError(res, 500, {
      code: "INTERNAL_ERROR",
      message: "Error al actualizar inventario",
      details: error instanceof Error ? error.message : error,
    });
  }
});

export default router;
