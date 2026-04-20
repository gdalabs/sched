# Sched

Self-hosted scheduling poll. Like Doodle, but you own your data.

## Quick Start

```bash
docker run -p 3000:3000 -v sched-data:/app/data gdalabs/sched
```

Open http://localhost:3000 — done.

## Features

- Create polls with candidate dates/times
- Share via URL — no account needed
- Respond with ○ (yes) △ (maybe) × (no)
- Best date highlighted automatically
- Mobile-friendly responsive UI
- SQLite — zero external dependencies
- Single Docker image, one command to deploy

## Development

```bash
git clone https://github.com/gdalabs/sched.git
cd sched
npm install
npm run dev
```

Frontend: http://localhost:5173
API: http://localhost:3000

## Build

```bash
npm run build
npm start
```

## Docker Build

```bash
docker build -t sched .
docker run -p 3000:3000 -v sched-data:/app/data sched
```

## Tech Stack

- **Backend**: [Hono](https://hono.dev/) + Node.js
- **Frontend**: Vanilla TypeScript
- **Database**: SQLite (better-sqlite3)
- **Build**: Vite + TypeScript

## License

MIT
