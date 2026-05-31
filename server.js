/**
 * server.js
 *
 * Application entry point.
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
    app.listen(env.PORT, () => {
      console.log(`API Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("[Server] Failed to start:", error.message);
    process.exit(1);
  }
}

startServer();
