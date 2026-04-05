import { Router } from "express";
import { db } from "../../../lib/db";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contrase\u00f1a son requeridos" });
  }

  const admin = await db.admin.findUnique({
    where: { email },
  });

  if (!admin || admin.password !== password) {
    return res.status(401).json({ error: "Credenciales inv\u00e1lidas" });
  }

  res.json({
    user: {
      name: admin.name,
      email: admin.email,
    }
  });
});

export default router;