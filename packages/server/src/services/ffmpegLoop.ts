import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

export function loopAudio(
  inputPath: string,
  outputPath: string,
  loopCount: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    ffmpeg(inputPath)
      .audioFilters(`aloop=loop=${loopCount - 1}:size=2e+09`)
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .on('end', () => {
        // Clean up uploaded file
        fs.unlink(inputPath, (err) => {
          if (err) console.error('Failed to delete upload:', err);
        });
        resolve();
      })
      .on('error', (err) => {
        fs.unlink(inputPath, () => {});
        reject(err);
      })
      .save(outputPath);
  });
}
