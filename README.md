# Background Audio Loop SaaS

A monorepo project for looping audio files using FFmpeg, with an Express backend and React frontend.

## Structure

```
background-audio-loop-saas/
├── packages/
│   ├── server/           # Express backend + serves frontend
│   └── frontend/         # Vite + React
├── package.json          # Root with workspaces
├── turbo.json            # Turborepo configuration
└── README.md
```

## Prerequisites

- Node.js 18+
- pnpm 9.0+
- FFmpeg installed on your system

## Installation

```bash
# Install pnpm if needed
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Install dependencies
pnpm install
```

## Development

```bash
# Run both server and frontend in dev mode
pnpm dev

# Server runs on http://localhost:4000
# Frontend dev server runs on http://localhost:5173 (proxies /api to :4000)
```

## Build for Production

```bash
# Build both packages
pnpm build

# Run production server (serves frontend from dist)
pnpm start
```

## Features

- Upload audio files (MP3, WAV, OGG, M4A)
- Loop audio 1-100 times using FFmpeg
- Download processed audio
- Monorepo setup with Turborepo
- TypeScript throughout
- React frontend with Vite

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
NODE_ENV=development
PORT=4000
```

## License

MIT
