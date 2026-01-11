import app from "./index.js";
import { env } from "./config/env.js";
import prisma from "./db/prisma.js";
import { serve } from "@hono/node-server";

const port = env.PORT;

serve({
  fetch: app.fetch,
  port,
});

console.log(`🚀 Server running on http://localhost:${port}`);
console.log(`📊 Health check: http://localhost:${port}/health`);
console.log(`🔐 Auth routes at /api/auth`);
console.log(`💰 Transaction routes at /api/transactions`);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
  process.exit(1);
});

export default app;
