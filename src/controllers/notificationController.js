/**
 * src/controllers/notificationController.js
 *
 * Express controllers for the Notification API.
 *
 * Controllers are kept thin — they:
 *  1. Extract validated data from req.body
 *  2. Delegate to models / queues
 *  3. Return HTTP responses
 *
 * Business logic lives in services and queue modules.
 */

const { Notification } = require("../models/Notification");
const { addEmailJob, getQueueCounts } = require("../queues/emailQueue");
const { getDLQCounts } = require("../queues/deadLetterQueue");
const { z } = require("zod");

//  Zod Schema (exported for use in routes/middleware) 
const sendEmailSchema = z.object({
  to: z
    .string({ required_error: "Recipient email is required" })
    .email("Must be a valid email address"),

  subject: z
    .string({ required_error: "Subject is required" })
    .min(1, "Subject cannot be empty")
    .max(150, "Subject must be under 150 characters"),

  body: z
    .string({ required_error: "Body is required" })
    .min(1, "Body cannot be empty"),

  type: z.enum(["OTP", "WELCOME", "MARKETING"], {
    required_error: "Type is required",
    invalid_type_error: "Type must be one of: OTP, WELCOME, MARKETING",
  }),
});

// ── Controller: POST /api/notifications/email 
/**
 * Queues an email notification.
 *
 * Steps:
 *  1. Save a QUEUED record in MongoDB
 *  2. Push a job to BullMQ with correct priority
 *  3. Update MongoDB record with the assigned jobId
 *  4. Return 202 Accepted (job is queued, not yet delivered)
 */
async function sendEmailNotification(req, res, next) {
  try {
    const { to, subject, body, type } = req.body;

    // ── Save to MongoDB first (status = QUEUED) 
    const notification = await Notification.create({
      to,
      subject,
      body,
      type,
      status: "QUEUED",
      queuedAt: new Date(),
    });

    // ── Push job to BullMQ queue 
    const job = await addEmailJob({
      notificationId: notification._id.toString(),
      to,
      subject,
      body,
      type,
    });

    // ── Save the BullMQ jobId back into MongoDB 
    notification.jobId = job.id;
    await notification.save();

    // ── Return 202 Accepted 
    // 202 = "request accepted for processing" (not 201 Created, since delivery hasn't happened yet)
    return res.status(202).json({
      success: true,
      message: "Notification queued successfully",
      data: {
        notificationId: notification._id,
        jobId: job.id,
        status: "QUEUED",
        type,
        to,
        queuedAt: notification.queuedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

//  Controller: GET /api/notifications/:id 
/**
 * Fetches a single notification's status and metadata.
 */
async function getNotificationById(req, res, next) {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id).lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
}

//  Controller: GET /api/notifications 
/**
 * Lists all notifications with optional filtering by status or type.
 * Supports pagination via ?page and ?limit query params.
 */
async function getAllNotifications(req, res, next) {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;

    // Build a dynamic filter object from query params
    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (type) filter.type = type.toUpperCase();

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
}

//  Controller: GET /api/notifications/dashboard 
/**
 * Returns a real-time dashboard of queue health and notification stats.
 *
 * MongoDB counts → ground truth of what happened
 * BullMQ counts  → current state of the queue (what's pending/active)
 */
async function getDashboard(req, res, next) {
  try {
    // MongoDB aggregation — count by status
    const dbStats = await Notification.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert array to { QUEUED: N, DELIVERED: N, ... } object
    const dbCounts = dbStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // BullMQ queue state counts
    const queueCounts = await getQueueCounts();
    const dlqCounts = await getDLQCounts();

    // Breakdown by notification type
    const typeStats = await Notification.aggregate([
      {
        $group: {
          _id: "$type",
          total: { $sum: 1 },
          delivered: {
            $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] },
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        // High-level totals from MongoDB
        totals: {
          queued: dbCounts.QUEUED || 0,
          processing: dbCounts.PROCESSING || 0,
          delivered: dbCounts.DELIVERED || 0,
          failed: dbCounts.FAILED || 0,
          total:
            (dbCounts.QUEUED || 0) +
            (dbCounts.PROCESSING || 0) +
            (dbCounts.DELIVERED || 0) +
            (dbCounts.FAILED || 0),
        },
        // Live queue state from Redis/BullMQ
        queue: {
          waiting: queueCounts.waiting || 0,
          active: queueCounts.active || 0,
          completed: queueCounts.completed || 0,
          failed: queueCounts.failed || 0,
          delayed: queueCounts.delayed || 0,
        },
        // DLQ state from Redis/BullMQ
        deadLetterQueue: {
          waiting: dlqCounts.waiting || 0,
          total:
            (dlqCounts.waiting || 0) +
            (dlqCounts.active || 0) +
            (dlqCounts.completed || 0) +
            (dlqCounts.failed || 0),
        },
        // Per-type breakdown
        byType: typeStats,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  sendEmailNotification,
  getNotificationById,
  getAllNotifications,
  getDashboard,
  sendEmailSchema,
};
