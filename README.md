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

---

## Prerequisites

- **Node.js** v18+ (LTS recommended)
- **Redis** v7+ (running locally or via Docker)
- **MongoDB** v6+ (running locally or MongoDB Atlas)
- **Mailtrap account** (free) for email testing — https://mailtrap.io

---

## Redis Setup

### Option A: Docker (Recommended for local dev)

```bash
# Pull and run Redis in the background
docker run -d \
  --name redis-notification \
  -p 6379:6379 \
  redis:7-alpine

# Verify it's running
docker ps

# Connect to Redis CLI to test
docker exec -it redis-notification redis-cli ping
# Should print: PONG
```

### Option B: Install natively on macOS

```bash
brew install redis
brew services start redis

# Verify
redis-cli ping
# Should print: PONG
```

### Option C: Install natively on Ubuntu/Debian

```bash
sudo apt update
sudo apt install redis-server -y
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping
```

### Checking BullMQ keys in Redis (debugging)

```bash
redis-cli
> KEYS bull:*            # See all BullMQ queue keys
> LLEN bull:email-notifications:wait   # Jobs waiting
```

---

## MongoDB Setup

### Option A: Docker

```bash
docker run -d \
  --name mongo-notification \
  -p 27017:27017 \
  mongo:7

# Connect via Mongosh to verify
mongosh "mongodb://localhost:27017/notification_service"
```

### Option B: MongoDB Atlas (Cloud — free tier)

1. Go to https://cloud.mongodb.com
2. Create a free M0 cluster
3. Get your connection string
4. Set `MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/notification_service`

### Option C: Install natively on macOS

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Verify MongoDB collections after sending notifications

```js
// In mongosh:
use notification_service
db.notifications.find().pretty()
db.notifications.countDocuments({ status: "DELIVERED" })
```

---

## Local Development

### Step 1: Clone and install dependencies

```bash
git clone <your-repo-url>
cd notification-service
npm install
```

### Step 2: Configure environment variables

```bash
cp .env.example .env
# Edit .env with your actual values:
#   MONGO_URI, SMTP_HOST, SMTP_USER, SMTP_PASS
```

**Getting Mailtrap credentials:**
1. Sign up at https://mailtrap.io (free)
2. Go to Email Testing → Inboxes → your inbox → SMTP Settings
3. Copy Host, Port, Username, Password into your .env

### Step 3: Start Redis and MongoDB

```bash
# Using Docker (easiest):
docker run -d --name redis -p 6379:6379 redis:7-alpine
docker run -d --name mongo -p 27017:27017 mongo:7
```

### Step 4: Start the API server

```bash
npm run dev
# or
node server.js

# You should see:
# [MongoDB] Connected successfully
# [Redis] Ping successful
# API Server: http://localhost:3000
```

### Step 5: Start the Worker (in a separate terminal)

```bash
node src/workers/emailWorker.js

# You should see:
# [MongoDB] Connected successfully
# [Worker] Email worker ready | queue=email-notifications | concurrency=5
```

### Step 6: Send a test notification

```bash
curl -X POST http://localhost:3000/api/notifications/email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Your OTP Code",
    "body": "<h1>Your OTP is 123456</h1>",
    "type": "OTP"
  }'
```


