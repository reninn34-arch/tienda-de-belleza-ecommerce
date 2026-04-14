import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../../../lib/db";
import { sendError } from "../lib/errors";
import { logAdminAction } from "../lib/audit";

const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  cedula: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
});

const customerUpdateSchema = customerSchema.partial();

// ─── GET all customers ───────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  const { q } = req.query;
  const where: any = {};
  
  if (q) {
    where.OR = [
      { name: { contains: q as string, mode: 'insensitive' } },
      { email: { contains: q as string, mode: 'insensitive' } },
      { phone: { contains: q as string, mode: 'insensitive' } },
      { cedula: { contains: q as string, mode: 'insensitive' } },
    ];
  }

  const customers = await db.customer.findMany({
    where,
    orderBy: { totalSpent: "desc" },
    include: { 
      _count: { select: { orders: true } },
      orders: {
        orderBy: { date: "desc" },
        take: 1,
        include: { branch: { select: { name: true } } }
      }
    }
  });

  res.json(customers);
});

// ─── GET customer by id ──────────────────────────────────────────────────────

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: { 
      orders: {
        orderBy: { date: "desc" },
        take: 20,
        include: {
          branch: { select: { name: true } },
          _count: { select: { items: true } }
        }
      }
    }
  });

  if (!customer) {
    sendError(res, 404, { code: "NOT_FOUND", message: "Cliente no encontrado" });
    return;
  }

  res.json(customer);
});

// ─── POST create customer ────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, { code: "VALIDATION_ERROR", message: "Datos de cliente inválidos", details: parsed.error.flatten() });
    return;
  }

  try {
    const customer = await db.customer.create({
      data: parsed.data,
    });

    await logAdminAction(req, {
      action: "customer.create",
      entity: "customer",
      entityId: customer.id,
      details: { email: customer.email },
    });

    res.status(201).json(customer);
  } catch (error: any) {
    if (error.code === 'P2002') {
      sendError(res, 400, { code: "ALREADY_EXISTS", message: "Ya existe un cliente con este correo electrónico" });
      return;
    }
    throw error;
  }
});

// ─── PUT update customer ─────────────────────────────────────────────────────

router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = customerUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, { code: "VALIDATION_ERROR", message: "Datos inválidos", details: parsed.error.flatten() });
    return;
  }

  const updated = await db.customer.update({
    where: { id },
    data: parsed.data,
  });

  await logAdminAction(req, {
    action: "customer.update",
    entity: "customer",
    entityId: id,
    details: { fields: Object.keys(parsed.data) },
  });

  res.json(updated);
});

// ─── POST sync past orders ───────────────────────────────────────────────────

router.post("/sync-past-orders", async (req: Request, res: Response) => {
  const ACTIVE_STATUSES = ["pending", "processing", "completed"];
  
  const ordersWithoutCustomer = await db.order.findMany({
    where: { customerId: null },
  });

  let count = 0;
  for (const order of ordersWithoutCustomer) {
    if (!order.email) continue;
    
    // Find or Create customer by email
    let customer = await db.customer.findUnique({ where: { email: order.email } });
    
    if (!customer) {
      customer = await db.customer.create({
        data: {
          name: order.customer,
          email: order.email,
          address: order.address,
        }
      });
    }

    // Link order
    await db.order.update({
      where: { id: order.id },
      data: { customerId: customer.id }
    });

    // Update customer stats ONLY if status is active
    if (ACTIVE_STATUSES.includes(order.status)) {
      await db.customer.update({
        where: { id: customer.id },
        data: {
          totalSpent: { increment: order.total },
          ordersCount: { increment: 1 },
          lastOrderAt: order.date > (customer.lastOrderAt || new Date(0)) ? order.date : customer.lastOrderAt
        }
      });
    }

    count++;
  }

  res.json({ message: `Sincronización terminada. ${count} pedidos vinculados.` });
});

// ─── POST recalculate all stats ─────────────────────────────────────────────

router.post("/recalculate-all-stats", async (req: Request, res: Response) => {
  const ACTIVE_STATUSES = ["pending", "processing", "completed"];
  const customers = await db.customer.findMany({
    include: { orders: true }
  });

  for (const customer of customers) {
    const activeOrders = customer.orders.filter(o => ACTIVE_STATUSES.includes(o.status));
    const totalSpent = activeOrders.reduce((sum, o) => sum + o.total, 0);
    const lastOrderAt = activeOrders.length > 0 
      ? activeOrders.sort((a, b) => b.date.getTime() - a.date.getTime())[0].date 
      : null;

    await db.customer.update({
      where: { id: customer.id },
      data: {
        totalSpent,
        ordersCount: activeOrders.length,
        lastOrderAt
      }
    });
  }

  res.json({ message: "Resumenes de clientes recalculados exitosamente." });
});

export default router;
