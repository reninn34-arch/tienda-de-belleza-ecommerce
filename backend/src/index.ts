import "dotenv/config";
import express from "express";
import cors from "cors";
import productsRouter from "./routes/products";
import ordersRouter from "./routes/orders";
import settingsRouter from "./routes/settings";
import pagesRouter from "./routes/pages";
import tutorialsRouter from "./routes/tutorials";
import adminRouter from "./routes/admin";
import { requireAuth } from "./middleware/auth";

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ["http://localhost:3000", "http://localhost:3001"];

app.use(cors({ 
  origin: function (origin, callback) {
    // Permitir peticiones sin origin (como apps móviles o curl) o si el origen está en la lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));

// Middleware para proteger endpoints de escritura excepto órdenes y login
app.use((req, res, next) => {
  if (req.method === "GET") return next();
  if (req.path.startsWith("/api/admin/login")) return next();
  if (req.method === "POST" && req.path === "/api/orders") return next();
  
  requireAuth(req, res, next);
});

app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/tutorials", tutorialsRouter);
app.use("/api/admin", adminRouter);

const PORT = parseInt(process.env.PORT ?? "4000", 10);
app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
