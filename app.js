/**
 * app.js
 *
 * Express application factory.
 * Separated from server.js so the app can be imported in tests without
 * starting a real HTTP server.
 */

const express = require("express");
const notificationRoutes = require("./src/routes/notificationRoutes");
const errorHandler = require("./src/middleware/errorHandler");

const app = express();

// ── Global Middleware ────────────────────────────────────────────────────────

// Parse incoming JSON request bodies
app.use(express.json());

// Parse URL-encoded form data (e.g. from HTML forms)
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────────────────────
// Simple endpoint to verify the API server is alive.
// Used by load balancers, Docker health checks, and uptime monitors.
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Notification Service is running",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/notifications", notificationRoutes);

// ── 404 Handler ──────────────────────────────────────────────────────────────
// Catches requests to routes that don't exist
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// Must be last — Express identifies it by the 4-parameter signature
app.use(errorHandler);

module.exports = app;
