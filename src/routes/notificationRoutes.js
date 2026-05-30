const express = require("express");
const router = express.Router();
const validate = require("../middleware/validate");

const {
  sendEmailNotification,
  getNotificationById,
  getAllNotifications,
  getDashboard,
  sendEmailSchema,
} = require("../controllers/notificationController");

router.get("/dashboard", getDashboard);

router.post(
  "/email",
  validate(sendEmailSchema),
  sendEmailNotification
);

router.get("/", getAllNotifications);

router.get("/:id", getNotificationById);

module.exports = router;