/**
 * src/config/env.js
 *
 * Central place for all environment variables.
 * Fail fast at startup if anything critical is missing.
 */

require("dotenv").config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[ENV] Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const env = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",

  // MongoDB
  MONGO_URI: requireEnv("MONGO_URI"),

  // Redis
  REDIS_HOST: process.env.REDIS_HOST || "127.0.0.1",
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379", 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,

  // Email / SMTP
  SMTP_HOST: requireEnv("SMTP_HOST"),
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "2525", 10),
  SMTP_USER: requireEnv("SMTP_USER"),
  SMTP_PASS: requireEnv("SMTP_PASS"),
  EMAIL_FROM: process.env.EMAIL_FROM || "no-reply@notificationservice.com",

  // Queue / Worker
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || "3", 10),
  RETRY_DELAY_MS: parseInt(process.env.RETRY_DELAY_MS || "5000", 10),
};

module.exports = env;
