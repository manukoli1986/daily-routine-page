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

### Build & Run

```bash
docker build -t manukoli1986/daily-routine-page:latest .
docker run -p 3000:3000 manukoli1986/daily-routine-page:latest
```

### Push to Docker Hub

```bash
docker login
docker push manukoli1986/daily-routine-page:latest
```

### Pull & Run

```bash
docker pull manukoli1986/daily-routine-page:latest
docker run -p 3000:3000 manukoli1986/daily-routine-page:latest
```

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