/**
 * tests/notificationRoutes.test.js
 *
 * Test Express application router wiring and health status.
 */

const test = require("node:test");
const assert = require("node:assert");
const app = require("../app");

test("Express Router and app.js Integration Tests", async (t) => {
  await t.test("should export a working Express application instance", () => {
    assert.strictEqual(typeof app, "function");
    assert.strictEqual(typeof app.handle, "function");
  });

  await t.test("should register expected health check path", () => {
    const routes = app._router.stack.map(layer => layer.route ? layer.route.path : null);
    assert.ok(routes.includes("/health"));
  });
});
