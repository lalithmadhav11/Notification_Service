/**
 * tests/emailWorker.test.js
 *
 * Test emailWorker load and worker definition sanity.
 */

const test = require("node:test");
const assert = require("node:assert");

test("Email Worker Process Tests", async (t) => {
  await t.test("should be importable and run in test mode without starting processes", () => {
    // Simply check that dependencies can resolve and no syntax errors exist
    const workerPath = "../src/workers/emailWorker";
    assert.doesNotThrow(() => {
      require(workerPath);
    });
  });
});
