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
5. Optionally enable **Smart beat alignment** with BPM + beats-per-loop for tighter rhythmic loops.
6. Loop count supports up to 100 repeats for longer generated outputs.
7. Extract loop sections directly from YouTube links with either BPM-based timing or exact seconds.

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
- No system FFmpeg required by default (bundled via `@ffmpeg-installer/ffmpeg`)

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

- `POST /api/loop` – upload + create initial loop (optionally pass `bpm` + `beatsPerLoop`)
- `POST /api/loop/extend` – extend an existing generated file (optionally pass `bpm` + `beatsPerLoop`)
- `POST /api/loop/extract-youtube` – download audio from a YouTube URL and extract a precise loop segment (`startTimeSeconds` + either `loopDurationSeconds` or `bpm` + `beatsPerLoop`)
- `GET /api/loop/download/:filename` – download generated output

## Railway notes

- FFmpeg is bundled via `@ffmpeg-installer/ffmpeg` by default. You can override with `FFMPEG_PATH` if needed.
- Set `NODE_ENV=production` and `PORT` from Railway.
- Start command: `pnpm start`


When extending with beat alignment, the existing output is preserved and new beat-sized units are appended so the track grows continuously.

Use standard YouTube watch URLs (`https://www.youtube.com/watch?v=...`) for best extraction reliability.
