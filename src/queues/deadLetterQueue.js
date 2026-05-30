const { Queue } = require("bullmq");
const { redisConnectionOptions } = require("../config/redis");

const DLQ_QUEUE_NAME = "email-notifications-dlq";

const deadLetterQueue = new Queue(DLQ_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 1,

    // Keep failed DLQ jobs for analysis
    removeOnFail: {
      age: 2592000,
      count: 5000,
    },

    // Keep completed replays temporarily
    removeOnComplete: {
      age: 604800,
      count: 1000,
    },
  },
});

/**
 * Moves a permanently failed job into the Dead Letter Queue.
 */
async function addToDLQ(failedJobData, reason) {
  const dlqPayload = {
    ...failedJobData,
    dlqReason: reason,
    dlqTimestamp: new Date().toISOString(),
  };

  const job = await deadLetterQueue.add("dlq-email", dlqPayload, {
    attempts: 1,
  });

  console.warn(
    `[DLQ] Job moved to Dead Letter Queue | jobId=${job.id} | to=${failedJobData.to} | reason=${reason}`
  );

  return job;
}

/**
 * Returns DLQ job counts.
 */
async function getDLQCounts() {
  return deadLetterQueue.getJobCounts("waiting", "active", "completed", "failed");
}

module.exports = {
  deadLetterQueue,
  addToDLQ,
  getDLQCounts,
  DLQ_QUEUE_NAME,
};