/**
 * scripts/test-marketing.js
 *
 * Simulates client request to trigger Marketing notification queueing.
 */

const http = require("http");
const env = require("../src/config/env");

const payload = JSON.stringify({
  to: "subscriber@example.com",
  subject: "Flash Sale: 50% Off Everything!",
  body: "<h1>Don't Miss Out!</h1><p>Use code FLASH50 at checkout.</p>",
  type: "MARKETING",
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
