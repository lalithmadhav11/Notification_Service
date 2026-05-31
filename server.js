/**
 * server.js
 *
 * Application entry point.
 *
 * Responsibilities:
 *  1. Connect to MongoDB
 *  2. Verify Redis is reachable
 *  3. Start the Express HTTP server
 *
 * The worker (emailWorker.js) is a SEPARATE process — run it with:
 *   node src/workers/emailWorker.js
 *
 * This separation follows the Producer/Consumer pattern:
 *  - server.js  → Producer (adds jobs to queue)
 *  - emailWorker.js → Consumer (processes jobs from queue)
 */

const app = require("./app");
const connectDB = require("./src/config/db");
const { redisClient } = require("./src/config/redis");
const env = require("./src/config/env");

async function startServer() {
  try {
    // ── 1. Connect MongoDB ────────────────────────────────────────────────
    await connectDB();

    // ── 2. Verify Redis connection ────────────────────────────────────────
    await redisClient.ping();
    console.log("[Redis] Ping successful.");

    // ── 3. Start HTTP server ──────────────────────────────────────────────
    const server = app.listen(env.PORT, () => {
      console.log(`\n${"─".repeat(50)}`);
      console.log(`  Notification Service`);
      console.log(`${"─".repeat(50)}`);
      console.log(`  API Server  : http://localhost:${env.PORT}`);
      console.log(`  Environment : ${env.NODE_ENV}`);
      console.log(`  Health      : http://localhost:${env.PORT}/health`);
      console.log(`  Dashboard   : http://localhost:${env.PORT}/api/notifications/dashboard`);
      console.log(`${"─".repeat(50)}`);
      console.log(`  ⚠  Worker NOT started here.`);
      console.log(`  Run separately: node src/workers/emailWorker.js`);
      console.log(`${"─".repeat(50)}\n`);
    });

    // ── Graceful Shutdown ─────────────────────────────────────────────────
    // Lets in-flight HTTP requests finish before exiting.
    async function gracefulShutdown(signal) {
      console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        console.log("[Server] HTTP server closed.");
        await redisClient.quit();
        console.log("[Redis] Connection closed.");
        process.exit(0);
      });

      // Force exit after 10 seconds if graceful shutdown takes too long
      setTimeout(() => {
        console.error("[Server] Forced shutdown after timeout.");
        process.exit(1);
      }, 10000);
    }

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle unhandled promise rejections (e.g. a forgotten await)
    process.on("unhandledRejection", (reason) => {
      console.error("[Server] Unhandled Promise Rejection:", reason);
    });

    // Handle uncaught exceptions (e.g. a thrown error outside async context)
    process.on("uncaughtException", (error) => {
      console.error("[Server] Uncaught Exception:", error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error("[Server] Failed to start:", error.message);
    process.exit(1);
  }
}

startServer();
