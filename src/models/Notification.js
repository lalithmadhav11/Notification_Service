/*

  Status lifecycle:
   QUEUED → PROCESSING → DELIVERED
                       └→ FAILED (moved to DLQ after max retries)
 */

const mongoose = require("mongoose");

// Allowed notification types — maps directly to queue priority
const NOTIFICATION_TYPES = ["OTP", "WELCOME", "MARKETING"];

// All possible statuses a notification can have
const NOTIFICATION_STATUSES = [
  "QUEUED",
  "PROCESSING",
  "DELIVERED",
  "FAILED",
];

const notificationSchema = new mongoose.Schema(
  {
    // Recipient details
    to: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },

    // Type determines the priority in BullMQ queue
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },

    // Current state of this notification
    status: {
      type: String,
      enum: NOTIFICATION_STATUSES,
      default: "QUEUED",
    },

    // BullMQ job ID — lets us correlate queue jobs with DB records
    jobId: {
      type: String,
      default: null,
    },

    // How many times the worker has attempted delivery
    attempts: {
      type: Number,
      default: 0,
    },

    // Last error message (populated on failure)
    errorMessage: {
      type: String,
      default: null,
    },

    // Timestamps for observability / debugging
    queuedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },

    // True if the job was moved to Dead Letter Queue
    inDLQ: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// Index for fast dashboard queries on status
notificationSchema.index({ status: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ jobId: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = { Notification, NOTIFICATION_TYPES, NOTIFICATION_STATUSES };
