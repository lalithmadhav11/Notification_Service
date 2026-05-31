/**
 * app.js
 *
 * Express application factory.
 * Separated from server.js so the app can be imported in tests without
 * starting a real HTTP server.
 */

const express = require("express");

const app = express();

// ── Global Middleware ────────────────────────────────────────────────────────

// Parse incoming JSON request bodies
app.use(express.json());

// Parse URL-encoded form data (e.g. from HTML forms)
app.use(express.urlencoded({ extended: true }));

module.exports = app;
