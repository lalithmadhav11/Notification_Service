/**
 * src/config/db.js
 *
 * MongoDB connection using Mongoose.
 * Retries the connection up to 5 times before giving up.
 */

const mongoose = require("mongoose");
const env = require("./env");

const MAX_CONNECT_RETRIES = 5;
const RETRY_INTERVAL_MS = 3000;

async function connectDB(retryCount = 0) {
  try {
    await mongoose.connect(env.MONGO_URI, {
      // These are good defaults; Mongoose 8+ handles most options internally
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected successfully to: ${env.MONGO_URI}`);
  } catch (error) {
    if (retryCount < MAX_CONNECT_RETRIES) {
      console.warn(
        `[MongoDB] Connection failed. Retrying in ${RETRY_INTERVAL_MS / 1000}s... (attempt ${retryCount + 1}/${MAX_CONNECT_RETRIES})`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
      return connectDB(retryCount + 1);
    }
    console.error("[MongoDB] Max retries reached. Shutting down.");
    process.exit(1);
  }
}

// Log disconnection events for observability
mongoose.connection.on("disconnected", () => {
  console.warn("[MongoDB] Disconnected from database.");
});

mongoose.connection.on("reconnected", () => {
  console.log("[MongoDB] Reconnected to database.");
});

module.exports = connectDB;
