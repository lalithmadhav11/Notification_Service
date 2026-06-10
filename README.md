# Event-Driven Notification Service

A production-grade backend project demonstrating Redis, BullMQ, MongoDB, background workers,
retry mechanisms, Dead Letter Queues, and priority job scheduling.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Redis Setup](#redis-setup)
5. [MongoDB Setup](#mongodb-setup)
6. [Local Development](#local-development)
7. [API Reference](#api-reference)
8. [Sample Requests & Responses](#sample-requests--responses)
9. [Postman Collection](#postman-collection)
10. [Interview Q&A](#interview-qa)
11. [Resume Bullet Points](#resume-bullet-points)

---

## Architecture

```
Client
  │
  ▼
Express REST API (server.js)
  │
  ├─ Zod Validation
  ├─ Save to MongoDB (status=QUEUED)
  └─ Push to BullMQ Queue (Redis)
            │
            │  Priority:
            │  OTP=1 (highest) | WELCOME=5 | MARKETING=10 (lowest)
            ▼
      BullMQ Worker (emailWorker.js)
            │
            ├─ Update MongoDB → PROCESSING
            ├─ Send via Nodemailer (SMTP)
            │
            ├── SUCCESS → MongoDB → DELIVERED
            │
            └── FAILURE → BullMQ Retry (exponential backoff)
                              │
                         (max retries hit)
                              │
                              ├── MongoDB → FAILED
                              └── Dead Letter Queue (Redis)
```

### Key Design Decisions

| Decision | Reason |
|---|---|
| Producer/Consumer separation | Worker can scale independently from the API server |
| BullMQ over raw Redis pub/sub | BullMQ gives us retries, DLQ, priority, and monitoring for free |
| Exponential backoff | Prevents hammering a failing SMTP server |
| DLQ (Dead Letter Queue) | Failed jobs are preserved for inspection and manual replay |
| MongoDB for tracking | Persistent audit trail that survives Redis restarts |
| Zod validation | Catches bad input at the edge before it pollutes the queue |

---

## Project Structure

```
notification-service/
├── src/
│   ├── config/
│   │   ├── db.js              ← MongoDB connection with retry
│   │   ├── redis.js           ← IORedis connection for BullMQ
│   │   └── env.js             ← Centralised env var validation
│   ├── models/
│   │   └── Notification.js    ← Mongoose schema + status lifecycle
│   ├── queues/
│   │   ├── emailQueue.js      ← BullMQ Queue + priority map
│   │   └── deadLetterQueue.js ← DLQ for permanently failed jobs
│   ├── workers/
│   │   └── emailWorker.js     ← Background processor
│   ├── services/
│   │   └── emailService.js    ← Nodemailer SMTP delivery
│   ├── middleware/
│   │   ├── validate.js        ← Zod validation middleware factory
│   │   └── errorHandler.js    ← Global error handler
│   ├── controllers/
│   │   └── notificationController.js ← Route handlers + Zod schemas
│   └── routes/
│       └── notificationRoutes.js     ← Express router
├── app.js                     ← Express app (no server.listen here)
├── server.js                  ← Entry point (DB + Redis + listen)
├── package.json
└── .env.example
```
