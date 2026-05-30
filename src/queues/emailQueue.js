/**
 * src/queues/emailQueue.js
 *
 * Defines the main BullMQ Queue for email notifications.
 *
 * PRIORITY SYSTEM (lower number = higher priority in BullMQ):
 *   OTP       → priority 1  (urgent, sent first)
 *   WELCOME   → priority 5  (important but not time-critical)
 *   MARKETING → priority 10 (low urgency, processed last)
 *
 * RETRY STRATEGY:
 *   Uses exponential backoff — waits longer between each retry attempt.
 *   Formula: RETRY_DELAY_MS * 2^(attemptsMade)
 *   e.g. 5s → 10s → 20s for 3 retries
 */

const { Queue } = require("bullmq");
const { redisConnectionOptions } = require("../config/redis");
const env = require("../config/env");

// Queue name — must match exactly in the worker
const EMAIL_QUEUE_NAME = "email-notifications";

// Map notification type → BullMQ priority number
const PRIORITY_MAP = {
  OTP: 1,
  WELCOME: 5,
  MARKETING: 10,
};

// Create the BullMQ queue (connects to Redis under the hood)
const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    // How many times to retry before giving up
    attempts: env.MAX_RETRIES,

    backoff: {
      type: "exponential",
      delay: env.RETRY_DELAY_MS, // base delay in ms; doubles on each retry
    },

    // Keep completed jobs in Redis for 24 hours (useful for debugging)
    removeOnComplete: {
      age: 86400,   // seconds
      count: 1000,  // max completed jobs to keep
    },

    // Keep failed jobs in Redis for 7 days before auto-cleanup
    removeOnFail: {
      age: 604800,
      count: 500,
    },
  },
});

/**
 * Adds an email job to the queue with the correct priority.
 *
 * @param {Object} jobData       - Payload passed to the worker
 * @param {string} jobData.notificationId  - MongoDB _id of the Notification document
 * @param {string} jobData.to              - Recipient email
 * @param {string} jobData.subject         - Email subject
 * @param {string} jobData.body            - Email body (HTML or plain text)
 * @param {string} jobData.type            - 'OTP' | 'WELCOME' | 'MARKETING'
 *
 * @returns {Promise<Job>} The created BullMQ Job object
 */
async function addEmailJob(jobData) {
  const priority = PRIORITY_MAP[jobData.type] || 10;

  const job = await emailQueue.add(
    `send-${jobData.type.toLowerCase()}`,  // human-readable job name
    jobData,
    { priority }
  );

  console.log(
    `[Queue] Added job ${job.id} | type=${jobData.type} | priority=${priority} | to=${jobData.to}`
  );

  return job;
}


// Returns counts of jobs in each state.
// Used by the dashboard endpoint.
async function getQueueCounts() {
  const counts = await emailQueue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed"
  );
  return counts;
}

module.exports = {
  emailQueue,
  addEmailJob,
  getQueueCounts,
  EMAIL_QUEUE_NAME,
  PRIORITY_MAP,
};
