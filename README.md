# 🗓️ Daily Routine Planner

A beautiful daily routine planner with a rich analytics dashboard, built with **Koa.js** and **Chart.js**.

## Features

- **Routine Management** — Add, edit, delete, and complete daily routines
- **Category Tracking** — Work, Health, Personal, Meals, Leisure
- **Multi-Day Navigation** — Browse past & future days with per-date persistence
- **Analytics Dashboard** — Completion trends, category breakdown, progress rings, activity heatmap
- **Time-Range Selector** — View stats over 7, 14, or 30 days
- **Streak Tracking** — Current and best completion streaks

## Run Locally

```bash
npm install
npm start
```

- **Planner:** http://localhost:3000
- **Dashboard:** http://localhost:3000/dashboard.html

## Docker

### Build & Run (Single Architecture)

```bash
docker build -t manukoli1986/daily-routine-page:latest .
docker run -p 3000:3000 manukoli1986/daily-routine-page:latest
```

### Multi-Architecture Build

The Dockerfile supports building images for multiple CPU architectures using [Docker Buildx](https://docs.docker.com/build/buildx/).

| Platform | Description |
|---|---|
| `linux/amd64` | Standard x86_64 servers, Intel/AMD Macs |
| `linux/arm64` | Apple Silicon Macs, AWS Graviton, ARM servers |
| `linux/arm/v7` | Raspberry Pi, IoT devices |

**Using the convenience script:**

```bash
# Build for your current platform only
./docker-build.sh local

# Build multi-arch and push to a registry
./docker-build.sh push docker.io/manukoli1986/daily-routine-page:latest

# Inspect a pushed multi-arch manifest
./docker-build.sh inspect manukoli1986/daily-routine-page:latest
```

**Using Docker Buildx directly:**

```bash
# Create a multi-arch builder (one-time setup)
docker buildx create --name mybuilder --use --bootstrap

# Build & push for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  --push \
  -t manukoli1986/daily-routine-page:latest .
```

### Pull & Run

```bash
docker pull manukoli1986/daily-routine-page:latest
docker run -p 3000:3000 manukoli1986/daily-routine-page:latest
```

> Docker automatically pulls the correct architecture for your machine.

## Deploy on Azure App Service

1. Create a **Web App** in Azure Portal
2. Select **Docker Container** as the publish method
3. Choose **Docker Hub** → Image: `manukoli1986/daily-routine-page:latest`
4. Azure auto-injects the `PORT` env var — the app binds to it automatically

## Tech Stack

- **Backend:** Node.js + Koa.js + koa-static
- **Frontend:** Vanilla HTML/CSS/JS
- **Charts:** Chart.js (CDN)
- **Storage:** Browser localStorage
- **Container:** Docker (Alpine-based)