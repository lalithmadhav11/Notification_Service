/**
 * scripts/test-welcome.js
 *
 * Simulates client request to trigger Welcome notification queueing.
 */

const http = require("http");
const env = require("../src/config/env");

const payload = JSON.stringify({
  to: "welcome-user@example.com",
  subject: "Welcome to Our Platform!",
  body: "<h1>Welcome aboard!</h1><p>We're thrilled to have you here.</p>",
  type: "WELCOME",
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
