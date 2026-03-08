import fs from "fs";
import path from "path";
import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const ffmpegPath = process.env.FFMPEG_PATH || ffmpegInstaller.path;
ffmpeg.setFfmpegPath(ffmpegPath);

export type YouTubeExtractOptions = {
  url: string;
  outputPath: string;
  startTimeSeconds: number;
  loopDurationSeconds: number;
};

function ensureDir(filepath: string): void {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function normalizeYouTubeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").trim();
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }

    if (host.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/watch?v=${id}`;
      const shorts = parsed.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts?.[1]) return `https://www.youtube.com/watch?v=${shorts[1]}`;
    }
  } catch {
    return rawUrl;
  }

  return rawUrl;
}

function mapYouTubeError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);

  if (message.includes("Status code: 410")) {
    return new Error(
      "YouTube denied direct stream access (410). Try a different video URL (standard watch link), or retry shortly."
    );
  }

  if (message.includes("Video unavailable") || message.includes("private")) {
    return new Error("The selected YouTube video is unavailable or private.");
  }

  return new Error(message);
}

export async function extractLoopFromYouTube(options: YouTubeExtractOptions): Promise<void> {
  const { outputPath, startTimeSeconds, loopDurationSeconds } = options;
  const url = normalizeYouTubeUrl(options.url);

  if (!ytdl.validateURL(url)) {
    throw new Error("Invalid YouTube URL");
  }

  if (startTimeSeconds < 0) {
    throw new Error("startTimeSeconds must be >= 0");
  }

  if (loopDurationSeconds <= 0 || loopDurationSeconds > 120) {
    throw new Error("loopDurationSeconds must be > 0 and <= 120");
  }

  ensureDir(outputPath);
  const tempInputPath = path.join("uploads", `yt-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`);
  ensureDir(tempInputPath);

  await new Promise<void>(async (resolve, reject) => {
    try {
      await ytdl.getBasicInfo(url);
      const stream = ytdl(url, {
        quality: "highestaudio",
        filter: "audioonly",
        requestOptions: {
          headers: {
            "User-Agent": "Mozilla/5.0",
          },
        },
      });

      const fileWriter = fs.createWriteStream(tempInputPath);
      stream.on("error", (err: unknown) => reject(mapYouTubeError(err)));
      fileWriter.on("error", reject);
      fileWriter.on("finish", resolve);
      stream.pipe(fileWriter);
    } catch (err) {
      reject(mapYouTubeError(err));
    }
  });

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempInputPath)
        .setStartTime(startTimeSeconds)
        .duration(loopDurationSeconds)
        .audioCodec("libmp3lame")
        .audioBitrate("192k")
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .save(outputPath);
    });
  } finally {
    fs.unlink(tempInputPath, () => {});
  }
}
