/**
 * src/workers/emailWorker.js
 *
 * BullMQ Worker — the background process that consumes jobs from the email queue.
 *
 * HOW IT WORKS:
 *  1. Worker polls Redis for new jobs (BullMQ handles this automatically)
 *  2. For each job, it:
 *     a. Updates MongoDB status → PROCESSING
 *     b. Calls emailService.sendEmail()
 *     c. On success → updates MongoDB status → DELIVERED
 *     d. On failure → BullMQ retries automatically (with exponential backoff)
 *     e. On final failure (max retries exhausted) → moves job to DLQ
 *
 * RUN THIS SEPARATELY FROM THE API SERVER:
 *   node src/workers/emailWorker.js
 *
 * In production, you'd run multiple worker instances with PM2 or Docker.
 */

require("dotenv").config();

const { Worker } = require("bullmq");
const { redisConnectionOptions } = require("../config/redis");
const { Notification } = require("../models/Notification");
const { sendEmail } = require("../services/emailService");
const { addToDLQ } = require("../queues/deadLetterQueue");
const { EMAIL_QUEUE_NAME } = require("../queues/emailQueue");
const connectDB = require("../config/db");
const env = require("../config/env");

// Worker must connect to MongoDB since it updates notification records
connectDB();

/**
 * Job processor function — called by BullMQ for every job.
 * BullMQ passes the Job object which contains .data (our payload) and
 * useful metadata like .attemptsMade, .id, etc.
 */
async function processEmailJob(job) {
  const { notificationId, to, subject, body, type } = job.data;

  console.log(
    `[Worker] Processing job ${job.id} | attempt ${job.attemptsMade + 1}/${env.MAX_RETRIES} | type=${type} | to=${to}`
  );

  // ── Step 1: Mark as PROCESSING in MongoDB 
  await Notification.findByIdAndUpdate(notificationId, {
    status: "PROCESSING",
    attempts: job.attemptsMade + 1,
    processedAt: new Date(),
  });

  // ── Step 2: Attempt email delivery 
  // If sendEmail throws, BullMQ catches it and retries automatically.
  await sendEmail({ to, subject, body });

  // ── Step 3: Mark as DELIVERED in MongoDB 
  await Notification.findByIdAndUpdate(notificationId, {
    status: "DELIVERED",
    deliveredAt: new Date(),
    errorMessage: null,
  });

  console.log(`[Worker] Job ${job.id} delivered successfully.`);
}

// ── Create the Worker 
const emailWorker = new Worker(EMAIL_QUEUE_NAME, processEmailJob, {
  connection: redisConnectionOptions,

  // How many jobs this worker processes simultaneously
  concurrency: env.WORKER_CONCURRENCY,
});

// ── Event Listeners 

emailWorker.on("completed", (job) => {
  console.log(`[Worker] ✓ Job ${job.id} completed.`);
});

/**
 * "failed" fires on EVERY failed attempt (including intermediate retries).
 * We only move to DLQ when it's the final attempt.
 */
emailWorker.on("failed", async (job, error) => {
  const isLastAttempt = job.attemptsMade >= env.MAX_RETRIES;

  console.error(
    `[Worker] ✗ Job ${job.id} failed (attempt ${job.attemptsMade}/${env.MAX_RETRIES}): ${error.message}`
  );

  if (isLastAttempt) {
    console.warn(`[Worker] Job ${job.id} exhausted all retries → moving to DLQ.`);

    // Update MongoDB: mark as permanently failed
    await Notification.findByIdAndUpdate(job.data.notificationId, {
      status: "FAILED",
      failedAt: new Date(),
      errorMessage: error.message,
      inDLQ: true,
    });

    // Push to Dead Letter Queue for manual inspection / replay
    await addToDLQ(job.data, error.message);
  } else {
    // Intermediate failure — update the attempt count and error in MongoDB
    await Notification.findByIdAndUpdate(job.data.notificationId, {
      attempts: job.attemptsMade,
      errorMessage: error.message,
      // Keep status as PROCESSING — it will be retried
    });
    console.log(`[Worker] Job ${job.id} will be retried by BullMQ.`);
  }
});

emailWorker.on("error", (error) => {
  console.error("[Worker] Worker-level error:", error.message);
});

emailWorker.on("ready", () => {
  console.log(
    `[Worker] Email worker ready | queue=${EMAIL_QUEUE_NAME} | concurrency=${env.WORKER_CONCURRENCY}`
  );
});

// ── Graceful Shutdown 
// Lets the current job(s) finish before exiting — avoids data corruption.
async function gracefulShutdown(signal) {
  console.log(`[Worker] Received ${signal}. Shutting down gracefully...`);
  await emailWorker.close();
  console.log("[Worker] Worker closed. Exiting.");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = emailWorker; // exported for testing
