import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import path from "path";

const ffmpegPath = process.env.FFMPEG_PATH || ffmpegInstaller.path;
ffmpeg.setFfmpegPath(ffmpegPath);

type LoopOptions = {
  bpm?: number;
  beatsPerLoop?: number;
};

function applyBeatAlignedLoop(
  command: ffmpeg.FfmpegCommand,
  loopCount: number,
  bpm: number,
  beatsPerLoop: number
): ffmpeg.FfmpegCommand {
  const targetDurationSeconds = (60 / bpm) * beatsPerLoop;
  const roundedDuration = Number(targetDurationSeconds.toFixed(6));

  const splitOutputs = Array.from({ length: loopCount }, (_, i) => `[a${i}]`).join("");
  const concatInputs = Array.from({ length: loopCount }, (_, i) => `[a${i}]`).join("");
  const filter = `[0:a]atrim=0:${roundedDuration},asetpts=PTS-STARTPTS,asplit=${loopCount}${splitOutputs};${concatInputs}concat=n=${loopCount}:v=0:a=1[outa]`;

  return command.complexFilter(filter).outputOptions(["-map [outa]"]);
}

export function loopAudio(
  inputPath: string,
  outputPath: string,
  loopCount: number,
  cleanupInput = true,
  options: LoopOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let command = ffmpeg(inputPath);

    if (options.bpm && options.beatsPerLoop) {
      command = applyBeatAlignedLoop(command, loopCount, options.bpm, options.beatsPerLoop);
    } else {
      command = command.audioFilters(`aloop=loop=${loopCount - 1}:size=2e+09`);
    }

    command
      .audioCodec("libmp3lame")
      .audioBitrate("192k")
      .on("end", () => {
        if (cleanupInput) {
          fs.unlink(inputPath, (err: NodeJS.ErrnoException | null) => {
            if (err) console.error("Failed to delete upload:", err);
          });
        }
        resolve();
      })
      .on("error", (err: Error) => {
        if (cleanupInput) {
          fs.unlink(inputPath, () => {});
        }
        reject(err);
      })
      .save(outputPath);
  });
}
