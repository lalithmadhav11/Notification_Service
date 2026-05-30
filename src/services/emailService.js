/**
 * src/services/emailService.js
 *
 * Handles actual email delivery via Nodemailer + SMTP (Mailtrap for dev).
 *
 * This service is intentionally kept simple — it just sends email.
 * All retry/failure logic lives in the worker and queue layer.
 */

const nodemailer = require("nodemailer");
const env = require("../config/env");

// Create a single reusable transporter for the lifetime of the process.
// Nodemailer pools connections internally — no need to reconnect per email.
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

// Verify SMTP connection on service startup (only in development)
if (env.NODE_ENV === "development") {
  transporter.verify((error) => {
    if (error) {
      console.error("[EmailService] SMTP connection failed:", error.message);
    } else {
      console.log("[EmailService] SMTP connection verified. Ready to send emails.");
    }
  });
}

/**
 * Sends an email.
 *
 * @param {Object} options
 * @param {string} options.to      - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.body    - Email body (supports HTML)
 *
 * @returns {Promise<Object>} Nodemailer send info (includes messageId)
 * @throws  {Error}           If SMTP delivery fails
 */
async function sendEmail({ to, subject, body }) {
  const mailOptions = {
    from: `"Notification Service" <${env.EMAIL_FROM}>`,
    to,
    subject,
    // Support both plain text and HTML
    html: body,
    // Fallback plain text (strip HTML tags for simplicity)
    text: body.replace(/<[^>]*>/g, ""),
  };

  const info = await transporter.sendMail(mailOptions);

  console.log(
    `[EmailService] Email sent | to=${to} | subject="${subject}" | messageId=${info.messageId}`
  );

  return info;
}

module.exports = { sendEmail };
