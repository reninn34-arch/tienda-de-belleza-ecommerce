import "dotenv/config";
import express from "express";
import cors from "cors";
import productsRouter from "./routes/products";
import ordersRouter from "./routes/orders";
import settingsRouter from "./routes/settings";
import pagesRouter from "./routes/pages";
import tutorialsRouter from "./routes/tutorials";

const app = express();

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001"] }));
app.use(express.json({ limit: "10mb" }));

app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/tutorials", tutorialsRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = parseInt(process.env.PORT ?? "4000", 10);
app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
