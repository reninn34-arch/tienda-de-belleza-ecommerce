import { Router, Request, Response } from "express";
import { db } from "../../../lib/db";

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
  const body = req.body as Record<string, unknown>;
  const orderItems = ((body.products || body.items) as { id: string; name: string; price: number; quantity: number }[]) ?? [];

  // Check stock
  for (const item of orderItems) {
    const product = await db.product.findUnique({ where: { id: item.id } });
    if (product && product.stock < item.quantity) {
      res.status(400).json({
        error: `El producto ${product.name} no cuenta con stock suficiente. Disponible: ${product.stock}`,
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
      customer: (body.customer as string) ?? "",
      email: (body.email as string) ?? "",
      total: (body.total as number) ?? 0,
      subtotal: (body.subtotal as number) ?? 0,
      shipping: (body.shipping as number) ?? 0,
      tax: (body.tax as number) ?? 0,
      status: (body.status as string) ?? "pending",
      shippingMethod: (body.shippingMethod as string | null) ?? null,
      paymentMethod: (body.paymentMethod as string | null) ?? null,
      address: (body.address as string | null) ?? null,
      notes: (body.notes as string | null) ?? null,
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
  if (!order) { res.status(404).json({ error: "Not found" }); return; }

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
  const body = req.body as Record<string, unknown>;

  const existing = await db.order.findUnique({ where: { id }, include: { items: true } }) as unknown as OrderWithItems | null;
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const prevStatus = existing.status;
  const newStatus = body.status as string | undefined;

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
      status: (body.status as string) ?? existing.status,
      notes: (body.notes as string | null) ?? existing.notes,
      shippingMethod: (body.shippingMethod as string | null) ?? existing.shippingMethod,
      paymentMethod: (body.paymentMethod as string | null) ?? existing.paymentMethod,
      address: (body.address as string | null) ?? existing.address,
    },
    include: { items: true },
  });

  res.json(updated);
});

export default router;
