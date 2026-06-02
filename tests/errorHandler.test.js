/**
 * tests/errorHandler.test.js
 *
 * Test global error handling middleware.
 */

const test = require("node:test");
const assert = require("node:assert");
const errorHandler = require("../src/middleware/errorHandler");

test("Global Error Handler Middleware Tests", async (t) => {
  await t.test("should handle standard errors and return 500 status", () => {
    const err = new Error("Something went wrong");
    let responseStatus = null;
    let jsonResponse = null;

    const req = {};
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(obj) {
        jsonResponse = obj;
        return this;
      },
    };
    const next = () => {};

    errorHandler(err, req, res, next);

    assert.strictEqual(responseStatus, 500);
    assert.strictEqual(jsonResponse.success, false);
    assert.strictEqual(jsonResponse.message, "Something went wrong");
  });

  await t.test("should respect error status codes if defined", () => {
    const err = new Error("Not Authorized");
    err.status = 401;
    let responseStatus = null;

    const req = {};
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json() {
        return this;
      },
    };
    const next = () => {};

    errorHandler(err, req, res, next);

    assert.strictEqual(responseStatus, 401);
  });
});
