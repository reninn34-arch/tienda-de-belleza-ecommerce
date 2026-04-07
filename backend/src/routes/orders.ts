import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../../../lib/db";
import { sendError } from "../lib/errors";
import { logAdminAction } from "../lib/audit";

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

const STOCK_CONSUMED = new Set(["pending", "processing", "completed"]);
const STOCK_RESTORE = new Set(["cancelled", "refunded"]);

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
  shippingMethod: z.string().nullable().optional().default(null),
  paymentMethod: z.string().nullable().optional().default(null),
  address: z.string().nullable().optional().default(null),
  notes: z.string().nullable().optional().default(null),
  items: z.array(orderItemSchema).optional(),
  products: z.array(orderItemSchema).optional(),
}).refine(
  (data) => (data.items?.length ?? 0) > 0 || (data.products?.length ?? 0) > 0,
  { message: "Items son requeridos", path: ["items"] }
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

// GET all orders
router.get("/", async (_req: Request, res: Response) => {
  const orders = await db.order.findMany({
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

// POST create order (from store checkout)
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

  // Check stock
  for (const item of orderItems) {
    const product = await db.product.findUnique({ where: { id: item.id } });
    if (product && product.stock < item.quantity) {
      sendError(res, 400, {
        code: "STOCK_INSUFFICIENT",
        message: `El producto ${product.name} no cuenta con stock suficiente. Disponible: ${product.stock}`,
      });
      return;
    }
  }

  // Deduct stock
  for (const item of orderItems) {
    await db.product.updateMany({
      where: { id: item.id },
      data: { stock: { decrement: item.quantity } },
    });
  }

  const newOrder = await db.order.create({
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

  res.status(201).json(newOrder);
});

// GET order by id (enriched)
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const order = await db.order.findUnique({ where: { id }, include: { items: true } }) as unknown as OrderWithItems | null;
  if (!order) {
    sendError(res, 404, { code: "NOT_FOUND", message: "Not found" });
    return;
  }

  const productIds = order.items.map((i: OrderItemRow) => i.productId);
  const products = await db.product.findMany({ where: { id: { in: productIds } } }) as unknown as ProductRow[];
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  res.json({
    ...order,
    products: order.items.map((item: OrderItemRow) => ({
      ...item,
      image: productMap[item.productId]?.image ?? null,
    })),
  });
});

// PUT update order (with stock restore on cancel/refund)
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

  const existing = await db.order.findUnique({ where: { id }, include: { items: true } }) as unknown as OrderWithItems | null;
  if (!existing) {
    sendError(res, 404, { code: "NOT_FOUND", message: "Not found" });
    return;
  }

  const prevStatus = existing.status;
  const newStatus = body.status;

  if (
    newStatus &&
    newStatus !== prevStatus &&
    STOCK_RESTORE.has(newStatus) &&
    STOCK_CONSUMED.has(prevStatus)
  ) {
    for (const item of existing.items) {
      await db.product.updateMany({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  }

  const updated = await db.order.update({
    where: { id },
    data: {
      status: body.status ?? existing.status,
      notes: body.notes ?? existing.notes,
      shippingMethod: body.shippingMethod ?? existing.shippingMethod,
      paymentMethod: body.paymentMethod ?? existing.paymentMethod,
      address: body.address ?? existing.address,
    },
    include: { items: true },
  });

  await logAdminAction(req, {
    action: "order.update",
    entity: "order",
    entityId: id,
    details: { fields: Object.keys(body), status: body.status ?? existing.status },
  });

  res.json(updated);
});

export default router;
