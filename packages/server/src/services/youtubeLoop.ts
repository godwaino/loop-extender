import fs from "fs";
import path from "path";
import ytdl from "ytdl-core";
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

export async function extractLoopFromYouTube(options: YouTubeExtractOptions): Promise<void> {
  const { url, outputPath, startTimeSeconds, loopDurationSeconds } = options;

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

  await new Promise<void>((resolve, reject) => {
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
    stream.on("error", reject);
    fileWriter.on("error", reject);
    fileWriter.on("finish", resolve);
    stream.pipe(fileWriter);
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
