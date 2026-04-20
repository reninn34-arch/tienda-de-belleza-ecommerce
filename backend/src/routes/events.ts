import { Router } from "express";
import { posEventEmitter } from "../lib/events";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Endpoint for establishing SSE connection with authenticated users
// Note: Frontend will use EventSource or fetch ReadableStream. 
router.get("/", requireAuth, (req, res) => {
  // Set required headers for Server-Sent Events (SSE)
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  // Flush headers immediately needed by some older proxies
  res.flushHeaders?.();

  // Keep alive connection with empty comments occasionally (every 30 seconds)
  const keepAlive = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 20000);

  const eventListener = () => {
    // Write the event data to the client
    // For now we just tell the client "pos_update" and it refetches its needs
    res.write(`event: pos_update\n`);
    res.write(`data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
  };

  // Listen to the global event emitter
  posEventEmitter.on("pos_update", eventListener);

  // When connection closes naturally or gets interrupted, clean up
  req.on("close", () => {
    clearInterval(keepAlive);
    posEventEmitter.off("pos_update", eventListener);
  });
});

export default router;
