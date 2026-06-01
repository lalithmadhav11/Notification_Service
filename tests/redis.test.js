/**
 * tests/redis.test.js
 *
 * Test Redis connection configuration and export client.
 */

const test = require("node:test");
const assert = require("node:assert");
const { redisClient, redisConnectionOptions } = require("../src/config/redis");

test("Redis Client and Options Configuration Tests", async (t) => {
  t.after(async () => {
    await redisClient.quit();
  });

  await t.test("should export connection options matching env configurations", () => {
    assert.ok(redisConnectionOptions);
    assert.strictEqual(redisConnectionOptions.enableReadyCheck, false);
    assert.strictEqual(redisConnectionOptions.maxRetriesPerRequest, null);
  });

  await t.test("should export a working ioredis client", async () => {
    assert.ok(redisClient);
    const pong = await redisClient.ping();
    assert.strictEqual(pong, "PONG");
  });
});
