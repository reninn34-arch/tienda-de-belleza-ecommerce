import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../../../lib/db";
import { sendError, type ErrorCode } from "../lib/errors";
import { logAdminAction } from "../lib/audit";
import { AuthenticatedRequest } from "../middleware/auth";
import { posEventEmitter } from "../lib/events";

interface OrderItemRow {
  id: number;
  orderId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}
interface OrderRow {
  id: string;
  customer: string;
  email: string;
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  status: string;
  shippingMethod: string | null;
  paymentMethod: string | null;
  address: string | null;
  notes: string | null;
  branchId: string | null;
  customerId: string | null;
  date: Date;
  items: OrderItemRow[];
}
interface ProductRow {
  id: string;
  image: string | null;
  [key: string]: unknown;
}

type OrderWithItems = OrderRow;

const router = Router();

// Soportar tanto minúsculas/mayúsculas como español e inglés
const STOCK_CONSUMED = new Set([
  "pending", "processing", "completed",
  "pendiente", "procesando", "completado"
]);
const STOCK_RESTORE  = new Set([
  "cancelled", "refunded",
  "cancelado", "reembolsado"
]);

/** Nombre de la sucursal que atiende pedidos de delivery/online */
const ONLINE_BRANCH_NAME = "tienda-online";

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  quantity: z.coerce.number().int().positive(),
});

const orderCreateSchema = z.object({
  customer: z.string().min(1),
  email: z.string().email(),
  total: z.coerce.number().nonnegative().optional().default(0),
  subtotal: z.coerce.number().nonnegative().optional().default(0),
  shipping: z.coerce.number().nonnegative().optional().default(0),
  tax: z.coerce.number().nonnegative().optional().default(0),
  status: z.string().optional().default("pending"),
  /**
   * 'delivery' → descuenta de 'tienda-online'
   * 'pickup'   → descuenta de la sucursal indicada en branchId
   */
  shippingMethod: z.string().nullable().optional().default("delivery"),
  /**
   * Requerido cuando shippingMethod === 'pickup'.
   * Ignorado para 'delivery'.
   */
  branchId: z.string().nullable().optional().default(null),
  paymentMethod: z.string().nullable().optional().default(null),
  address: z.string().nullable().optional().default(null),
  cedula: z.string().nullable().optional().default(null),
  phone: z.string().nullable().optional().default(null),
  notes: z.string().nullable().optional().default(null),
  items: z.array(orderItemSchema).optional(),
  products: z.array(orderItemSchema).optional(),
}).refine(
  (data) => (data.items?.length ?? 0) > 0 || (data.products?.length ?? 0) > 0,
  { message: "Items son requeridos", path: ["items"] }
).refine(
  (data) => !(data.shippingMethod === "pickup" && !data.branchId),
  { message: "branchId es requerido cuando shippingMethod es 'pickup'", path: ["branchId"] }
);

const orderUpdateSchema = z.object({
  status: z.string().optional(),
  notes: z.string().nullable().optional(),
  shippingMethod: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "Se requiere al menos un campo" }
);

// ─── Errors ──────────────────────────────────────────────────────────────────

class StockError extends Error {
  code: ErrorCode = "STOCK_INSUFFICIENT";
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}

// ─── GET all orders ──────────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const where: any = {};
  
  // Si es VENDEDOR, solo ve pedidos de su sucursal
  if (authReq.user && authReq.user.role === "VENDEDOR" && authReq.user.branchId) {
    where.branchId = authReq.user.branchId;
  }

  const orders = await db.order.findMany({
    where,
    orderBy: { date: "desc" },
    include: { items: true },
  }) as unknown as OrderWithItems[];
  const shaped = orders.map((o: OrderWithItems) => ({
    ...o,
    products: o.items,
    items: o.items.length,
  }));
  res.json(shaped);
});

// ─── POST create order (from store checkout) ─────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  const parsed = orderCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, {
      code: "VALIDATION_ERROR",
      message: "Payload inválido",
      details: parsed.error.flatten(),
    });
    return;
  }
  const body = parsed.data;
  const orderItems = body.items ?? body.products ?? [];

  try {
    const newOrder = await db.$transaction(async (tx) => {
      const authReq = req as AuthenticatedRequest;
      
      // 0. Si es VENDEDOR, forzar su sucursal y validar
      if (authReq.user && authReq.user.role === "VENDEDOR") {
        if (!authReq.user.branchId) {
          throw new StockError("Tu usuario no tiene una sucursal asignada.");
        }
        // Forzar retiro en sucursal si es POS (y pickup)
        if (body.shippingMethod === "pickup") {
           body.branchId = authReq.user.branchId;
        }
      }

      // 1. Determinar la sucursal de la que se descontará el stock
      let targetBranchId: string;

      if (body.shippingMethod === "pickup" && body.branchId) {
        // Verificar que la sucursal existe
        const branch = await tx.branch.findUnique({ where: { id: body.branchId } });
        if (!branch) {
          throw new StockError(`La sucursal con ID "${body.branchId}" no existe.`);
        }
        targetBranchId = branch.id;
      } else {
        // delivery → usar la sucursal online
        const onlineBranch = await tx.branch.findUnique({ where: { name: ONLINE_BRANCH_NAME } });
        if (!onlineBranch) {
          throw new StockError(
            `La sucursal "${ONLINE_BRANCH_NAME}" no existe. Ejecuta el script de migración de datos.`
          );
        }
        targetBranchId = onlineBranch.id;
      }

      // 2. Validar y descontar stock de cada ítem en la sucursal objetivo
      for (const item of orderItems) {
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: item.id,
              branchId: targetBranchId,
            },
          },
          include: { branch: true },
        });

        if (!inventory) {
          throw new StockError(
            `El producto "${item.name}" no tiene inventario en esta sucursal.`
          );
        }

        if (inventory.stock < item.quantity) {
          throw new StockError(
            `El producto "${item.name}" no cuenta con stock suficiente en ${inventory.branch.name}. ` +
            `Disponible: ${inventory.stock}, solicitado: ${item.quantity}.`
          );
        }

        // Descontar stock
        await tx.inventory.update({
          where: {
            productId_branchId: {
              productId: item.id,
              branchId: targetBranchId,
            },
          },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // 3. Vincular o Crear Cliente (CRM)
      let customer = await tx.customer.findUnique({ where: { email: body.email } });
      if (!customer) {
        customer = await tx.customer.create({
          data: {
            name: body.customer,
            email: body.email,
            address: body.address,
            cedula: body.cedula,
            phone: body.phone,
          }
        });
      } else {
        // Actualizar datos si el cliente existe pero le faltan campos
        const updateData: any = {};
        if (body.cedula && !customer.cedula) updateData.cedula = body.cedula;
        if (body.phone && !customer.phone) updateData.phone = body.phone;
        
        if (Object.keys(updateData).length > 0) {
          await tx.customer.update({
            where: { id: customer.id },
            data: updateData
          });
        }
      }

      // 4. Crear la orden y actualizar stats del cliente
      const newOrder = await tx.order.create({
        data: {
          id: `ORD-${Date.now()}`,
          customer: body.customer,
          email: body.email,
          total: body.total ?? 0,
          subtotal: body.subtotal ?? 0,
          shipping: body.shipping ?? 0,
          tax: body.tax ?? 0,
          status: body.status ?? "pending",
          shippingMethod: body.shippingMethod ?? null,
          paymentMethod: body.paymentMethod ?? null,
          address: body.address ?? null,
          notes: body.notes ?? null,
          branchId: targetBranchId,
          customerId: customer.id,
          cedula: body.cedula,
          date: new Date(),
          items: {
            create: orderItems.map((item) => ({
              productId: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // Actualizar stats del cliente SOLO si el pedido es "activo"
      if (STOCK_CONSUMED.has(newOrder.status.toLowerCase())) {
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            totalSpent: { increment: body.total ?? 0 },
            ordersCount: { increment: 1 },
            lastOrderAt: new Date()
          }
        });
      }

      return newOrder;
    });

    posEventEmitter.emit("pos_update");
    res.status(201).json(newOrder);
  } catch (error) {
    if (error instanceof StockError) {
      sendError(res, 400, { code: error.code, message: error.message });
      return;
    }
    throw error;
  }
});

// ─── GET order by id (enriched) ──────────────────────────────────────────────

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true },
  }) as unknown as OrderWithItems | null;
  if (!order) {
    sendError(res, 404, { code: "NOT_FOUND", message: "Not found" });
    return;
  }

  const productIds = order.items.map((i: OrderItemRow) => i.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
  }) as unknown as ProductRow[];
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  res.json({
    ...order,
    products: order.items.map((item: OrderItemRow) => ({
      ...item,
      image: productMap[item.productId]?.image ?? null,
    })),
  });
});

// ─── PUT update order (with stock restore on cancel/refund) ──────────────────

router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = orderUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, {
      code: "VALIDATION_ERROR",
      message: "Payload inválido",
      details: parsed.error.flatten(),
    });
    return;
  }
  const body = parsed.data;

  const existing = await db.order.findUnique({
    where: { id },
    include: { items: true },
  }) as unknown as OrderWithItems | null;
  if (!existing) {
    sendError(res, 404, { code: "NOT_FOUND", message: "Not found" });
    return;
  }


  const prevStatus = existing.status;
  const newStatus  = body.status;

  // Normalizamos a minúsculas AQUÍ ARRIBA para que sirva tanto para Stock como para CRM
  const prev = prevStatus.toLowerCase();
  const next = newStatus ? newStatus.toLowerCase() : "";

  // Restaurar stock si la orden pasa a cancelada/reembolsada desde un estado activo
  if (
    newStatus &&
    newStatus !== prevStatus &&
    STOCK_RESTORE.has(next) &&   // <- ¡Usar next!
    STOCK_CONSUMED.has(prev)     // <- ¡Usar prev!
  ) {
    // Usar la sucursal guardada en la orden (si aplica) o la online como fallback
    const branchId = existing.branchId;
    if (branchId) {
      for (const item of existing.items) {
        await db.inventory.updateMany({
          where: {
            productId: item.productId,
            branchId,
          },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
  }

    // ─── CRM LTV Adjustment ────────────────────────────────────────────────────
    if (newStatus && newStatus !== prevStatus && existing.customerId) {
      // Ya normalizado arriba
      const wasActive = STOCK_CONSUMED.has(prev);
      const isNowActive = STOCK_CONSUMED.has(next);

      // Si antes era Activo (ej. completado) y ahora ya NO lo es (ej. cancelado) -> DESCONTAR
      if (wasActive && !isNowActive) {
        await db.customer.update({
          where: { id: existing.customerId },
          data: {
            totalSpent: { decrement: existing.total },
            ordersCount: { decrement: 1 }
          }
        });
      }
      // Si antes NO era activo (ej. pago pendiente/fallido/cancelado) y ahora SÍ es activo -> SUMAR
      else if (!wasActive && isNowActive) {
        await db.customer.update({
          where: { id: existing.customerId },
          data: {
            totalSpent: { increment: existing.total },
            ordersCount: { increment: 1 },
            lastOrderAt: new Date()
          }
        });
      }
      // Nota: Si pasa de "pendiente" a "completado" (ambos son Activos), no suma ni resta, 
      // porque el valor ya se sumó en el momento en que el cliente creó el pedido.
    }

  const updated = await db.order.update({
    where: { id },
    data: {
      status:         body.status         ?? existing.status,
      notes:          body.notes          ?? existing.notes,
      shippingMethod: body.shippingMethod ?? existing.shippingMethod,
      paymentMethod:  body.paymentMethod  ?? existing.paymentMethod,
      address:        body.address        ?? existing.address,
    },
    include: { items: true },
  });

  await logAdminAction(req, {
    action: "order.update",
    entity: "order",
    entityId: id,
    details: { fields: Object.keys(body), status: body.status ?? existing.status },
  });

  posEventEmitter.emit("pos_update");
  res.json(updated);
});

export default router;
