/**
 * src/config/redis.js
 *
 * Creates a single shared IORedis connection.
 * BullMQ requires IORedis — it does NOT use the built-in redis package.
 *
 * We export a connection config object (not the client itself) because
 * BullMQ creates its own internal connections from this config.
 */

const { Redis } = require("ioredis");
const env = require("./env");

// BullMQ-compatible connection options
const redisConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,    // Required by BullMQ
};

/**
 * Standalone IORedis client used only for health checks and dashboard stats.
 * BullMQ manages its own connections internally using redisConnectionOptions.
 */
const redisClient = new Redis(redisConnectionOptions);

redisClient.on("connect", () => {
  console.log(`[Redis] Connected to ${env.REDIS_HOST}:${env.REDIS_PORT}`);
});

redisClient.on("error", (err) => {
  console.error("[Redis] Connection error:", err.message);
});

redisClient.on("reconnecting", () => {
  console.warn("[Redis] Reconnecting...");
});

module.exports = {
  redisConnectionOptions,
  redisClient,
};
