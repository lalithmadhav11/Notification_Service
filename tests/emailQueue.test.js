/**
 * tests/emailQueue.test.js
 *
 * Test BullMQ Email Queue initialization and wrapper exports.
 */

const test = require("node:test");
const assert = require("node:assert");
const { emailQueue, queueEmail } = require("../src/queues/emailQueue");

test("Email Queue Service Tests", async (t) => {
  await t.test("should export a Queue instance and queueEmail helper function", () => {
    assert.ok(emailQueue);
    assert.strictEqual(typeof queueEmail, "function");
    assert.strictEqual(emailQueue.constructor.name, "Queue");
  });
});
