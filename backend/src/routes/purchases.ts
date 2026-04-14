import { Router, Request, Response } from "express";
import { db } from "../../../lib/db";
import { z } from "zod";
import { sendError } from "../lib/errors";

const router = Router();

const PurchaseSchema = z.object({
  supplierId: z.string(),
  branchId: z.string(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    unitCost: z.number().positive()
  })).min(1)
});

// GET /api/admin/purchases — Lista de compras
router.get("/", async (req: Request, res: Response) => {
  const { status, supplierId } = req.query;
  const where: any = {};
  if (status) where.status = status;
  if (supplierId) where.supplierId = supplierId;

  const purchases = await db.purchaseOrder.findMany({
    where,
    include: {
      supplier: { select: { name: true } },
      branch: { select: { name: true } },
      _count: { select: { items: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  res.json(purchases);
});

// GET /api/admin/purchases/:id — Detalle de compra
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const purchase = await db.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      branch: true,
      items: {
        include: { product: { select: { name: true, image: true } } }
      }
    }
  });
  if (!purchase) return sendError(res, 404, { code: "NOT_FOUND", message: "Compra no encontrada" });
  res.json(purchase);
});

// POST /api/admin/purchases — Crear nueva compra (Entrada de mercancía)
router.post("/", async (req: Request, res: Response) => {
  const parsed = PurchaseSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, { code: "VALIDATION_ERROR", message: "Datos inválidos", details: parsed.error });

  const { supplierId, branchId, notes, items } = parsed.data;
  const totalAmount = items.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);

  // Generar un ID interno simple OC-XXXX
  const lastOrder = await db.purchaseOrder.findFirst({ orderBy: { createdAt: 'desc' } });
  const nextNum = lastOrder ? parseInt(lastOrder.internalId.split('-')[1]) + 1 : 1001;
  const internalId = `OC-${nextNum}`;

  const purchase = await db.purchaseOrder.create({
    data: {
      internalId,
      supplierId,
      branchId,
      notes,
      totalAmount,
      status: "PENDING",
      items: {
        create: items
      }
    },
    include: { items: true }
  });

  res.status(201).json(purchase);
});

// PUT /api/admin/purchases/:id/status — Actualizar estado y afectar stock
router.put("/:id/status", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // PENDING, RECEIVED, CANCELLED

  const existing = await db.purchaseOrder.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!existing) return sendError(res, 404, { code: "NOT_FOUND", message: "Compra no encontrada" });
  if (existing.status === "RECEIVED") return sendError(res, 400, { code: "BAD_REQUEST", message: "Esta compra ya fue recibida y no se puede modificar" });
  if (existing.status === "CANCELLED") return sendError(res, 400, { code: "BAD_REQUEST", message: "Esta compra ya fue cancelada" });

  if (status === "RECEIVED") {
    // ─── LÓGICA DE ACTUALIZACIÓN DE STOCK ─────────────────────────────────────
    await db.$transaction(async (tx) => {
      // 1. Marcar como recibida
      await tx.purchaseOrder.update({
        where: { id },
        data: { 
          status: "RECEIVED",
          receivedAt: new Date()
        }
      });

      // 2. Incrementar stock e intentar actualizar costos
      for (const item of existing.items) {
        // Actualizar o crear inventario en la sucursal destino
        await tx.inventory.upsert({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: existing.branchId
            }
          },
          update: {
            stock: { increment: item.quantity }
          },
          create: {
            productId: item.productId,
            branchId: existing.branchId,
            stock: item.quantity
          }
        });

        // RECOMENDACIÓN: Actualizar el costo base del producto con el último costo de compra
        await tx.product.update({
          where: { id: item.productId },
          data: { cost: item.unitCost }
        });
      }
    });

    return res.json({ success: true, message: "Inventario actualizado correctamente" });
  }

  // Otros cambios de estado simples (ej: Cancelar)
  const updated = await db.purchaseOrder.update({
    where: { id },
    data: { status }
  });

  res.json(updated);
});

export default router;
