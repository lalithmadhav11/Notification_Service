/**
 * src/utils/logger.js
 *
 * Light-weight custom logger that adds timestamps, levels, and colors
 * to standard logs. Easily swappable for Winston or Bunyan in production.
 */

const env = require("../config/env");

const COLORS = {
  reset: "\x1b[0m",
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m",  // Green
  warn: "\x1b[33m",  // Yellow
  error: "\x1b[31m", // Red
};

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const color = COLORS[level] || COLORS.reset;
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
  return `${color}[${timestamp}] [${level.toUpperCase()}]${COLORS.reset} ${message}${metaStr}`;
}

const logger = {
  debug: (msg, meta) => {
    if (env.NODE_ENV !== "production") {
      console.log(formatMessage("debug", msg, meta));
    }
  },
  info: (msg, meta) => {
    console.log(formatMessage("info", msg, meta));
  },
  warn: (msg, meta) => {
    console.warn(formatMessage("warn", msg, meta));
  },
  error: (msg, err, meta) => {
    const errorDetails = err ? ` | Error: ${err.message}\n${err.stack || ""}` : "";
    console.error(formatMessage("error", msg, meta) + errorDetails);
  },
};

module.exports = logger;
