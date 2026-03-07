# Loop Extender

A monorepo app for continuously looping and extending short audio clips with FFmpeg.

- **Backend**: Express + TypeScript
- **Frontend**: React + Vite + TypeScript
- **Deploy target**: Railway

## What it does

1. Upload a short audio clip.
2. Generate an initial looped output.
3. Keep extending the latest generated output (without uploading again).
4. Preview and download each new version.

## Structure

```
loop-extender/
├── packages/
│   ├── server/     # Express API + static file serving in production
│   └── frontend/   # React app (Vite)
├── package.json
└── turbo.json
```

## Requirements

- Node.js 18+
- pnpm 9+
- FFmpeg available in PATH

## Local development

```bash
pnpm install
pnpm dev
```

- API: `http://localhost:4000`
- Frontend (dev): `http://localhost:5173`

## Production build

```bash
pnpm build
pnpm start
```

The server serves the built frontend in production mode.

## API endpoints

- `POST /api/loop` – upload + create initial loop
- `POST /api/loop/extend` – extend an existing generated file
- `GET /api/loop/download/:filename` – download generated output

## Railway notes

- Ensure FFmpeg is installed in your Railway runtime image.
- Set `NODE_ENV=production` and `PORT` from Railway.
- Start command: `pnpm start`

