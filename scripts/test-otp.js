/**
 * scripts/test-otp.js
 *
 * Simulates client request to trigger OTP notification queueing.
 */

const http = require("http");
const env = require("../src/config/env");

const payload = JSON.stringify({
  to: "test-user@example.com",
  subject: "Your OTP Verification Code",
  body: "<h1>Verification Code: <strong>958473</strong></h1><p>Valid for 10 minutes.</p>",
  type: "OTP",
});

const options = {
  hostname: "localhost",
  port: env.PORT || 3000,
  path: "/api/notifications/email",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  },
};

const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => {
    body += chunk;
  });
  res.on("end", () => {
    console.log(`HTTP Status: ${res.statusCode}`);
    console.log("Response Body:", JSON.parse(body));
  });
});

req.on("error", (err) => {
  console.error("HTTP Request Error:", err.message);
});

req.write(payload);
req.end();
