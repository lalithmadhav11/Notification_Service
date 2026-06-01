/**
 * scripts/seed.js
 *
 * Seed MongoDB with dummy notification history for testing dashboard queries.
 */

const mongoose = require("mongoose");
const env = require("../src/config/env");
const Notification = require("../src/models/Notification");

const dummyNotifications = [
  {
    to: "test-otp1@example.com",
    subject: "Your OTP",
    body: "<h1>Your OTP is 111111</h1>",
    type: "OTP",
    status: "DELIVERED",
    jobId: "mock-1",
    attempts: 1,
    processedAt: new Date(Date.now() - 60000),
    deliveredAt: new Date(Date.now() - 58000),
  },
  {
    to: "test-welcome@example.com",
    subject: "Welcome to our portal",
    body: "<p>Welcome!</p>",
    type: "WELCOME",
    status: "QUEUED",
    attempts: 0,
  },
  {
    to: "test-marketing@example.com",
    subject: "Huge Sale",
    body: "<p>Save 50%!</p>",
    type: "MARKETING",
    status: "FAILED",
    jobId: "mock-3",
    attempts: 3,
    errorMessage: "SMTP Timeout",
    processedAt: new Date(Date.now() - 120000),
    failedAt: new Date(Date.now() - 110000),
  },
];

async function seed() {
  try {
    console.log(`Connecting to database: ${env.MONGO_URI}`);
    await mongoose.connect(env.MONGO_URI);
    console.log("Connected. Clearing old records...");
    await Notification.deleteMany({});
    console.log("Inserting dummy notifications...");
    await Notification.insertMany(dummyNotifications);
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

seed();
