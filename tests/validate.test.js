/**
 * tests/validate.test.js
 *
 * Test schema validation middleware factory.
 */

const test = require("node:test");
const assert = require("node:assert");
const zod = require("zod");
const validate = require("../src/middleware/validate");

const testSchema = zod.object({
  body: zod.object({
    username: zod.string().min(3),
  }),
});

test("Validation Middleware Factory Tests", async (t) => {
  await t.test("should pass validation when request data matches schema", () => {
    let nextCalled = false;
    const req = { body: { username: "alice" } };
    const res = {};
    const middleware = validate(testSchema);

    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  await t.test("should return 422 error status when request data violates schema rules", () => {
    const req = { body: { username: "al" } }; // too short
    let responseStatus = null;
    let jsonResponse = null;

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

    const middleware = validate(testSchema);
    middleware(req, res, () => {});

    assert.strictEqual(responseStatus, 422);
    assert.strictEqual(jsonResponse.success, false);
    assert.ok(Array.isArray(jsonResponse.errors));
    assert.strictEqual(jsonResponse.errors[0].field, "body.username");
  });
});
