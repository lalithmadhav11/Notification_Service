/**
 * tests/db.test.js
 *
 * Test database connection utilities.
 */

const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");

test("MongoDB Connection Utility Tests", async (t) => {
  t.afterEach(async () => {
    await mongoose.connection.close();
  });

  await t.test("should export a function", () => {
    assert.strictEqual(typeof connectDB, "function");
  });

  await t.test("should establish database connection", async () => {
    // Attempt connection
    await connectDB();
    assert.strictEqual(mongoose.connection.readyState, 1); // 1 = connected
  });
});
