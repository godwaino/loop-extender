import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { loopAudio } from "../services/ffmpegLoop";
import { extractLoopFromYouTube } from "../services/youtubeLoop";

const router = Router();

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".mp3", ".wav", ".ogg", ".m4a"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

function parseBeatOptions(body: any): { bpm?: number; beatsPerLoop?: number } {
  const bpm = body.bpm ? Number(body.bpm) : undefined;
  const beatsPerLoop = body.beatsPerLoop ? Number(body.beatsPerLoop) : undefined;

  if ((bpm && !beatsPerLoop) || (!bpm && beatsPerLoop)) {
    throw new Error("bpm and beatsPerLoop must be provided together");
  }

  if (bpm && (!Number.isFinite(bpm) || bpm < 40 || bpm > 240)) {
    throw new Error("bpm must be between 40 and 240");
  }

  if (beatsPerLoop && (!Number.isInteger(beatsPerLoop) || beatsPerLoop < 1 || beatsPerLoop > 32)) {
    throw new Error("beatsPerLoop must be an integer between 1 and 32");
  }

  return { bpm, beatsPerLoop };
}

function parseLoopDurationSeconds(body: any): number {
  const explicit = body.loopDurationSeconds ? Number(body.loopDurationSeconds) : undefined;
  const beatOptions = parseBeatOptions(body);

  if (explicit && beatOptions.bpm && beatOptions.beatsPerLoop) {
    throw new Error("Provide either loopDurationSeconds or bpm/beatsPerLoop, not both");
  }

  if (explicit !== undefined) {
    if (!Number.isFinite(explicit) || explicit <= 0 || explicit > 120) {
      throw new Error("loopDurationSeconds must be > 0 and <= 120");
    }
    return explicit;
  }

  if (beatOptions.bpm && beatOptions.beatsPerLoop) {
    return (60 / beatOptions.bpm) * beatOptions.beatsPerLoop;
  }

  throw new Error("Provide loopDurationSeconds or bpm/beatsPerLoop");
}

router.post("/", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const loopCount = parseInt(req.body.loopCount || "3", 10);
    if (loopCount < 1 || loopCount > 100) {
      return res.status(400).json({ error: "loopCount must be between 1 and 100" });
    }

    const beatOptions = parseBeatOptions(req.body);

    const outputFilename = `${uuidv4()}.mp3`;
    const outputPath = path.join("outputs", outputFilename);

    await loopAudio(req.file.path, outputPath, loopCount, true, beatOptions);

    return res.json({
      success: true,
      downloadUrl: `/api/loop/download/${outputFilename}`,
      filename: outputFilename,
    });
  } catch (error: any) {
    console.error("Loop error:", error);
    const message = error.message || "Failed to process audio";
    const status = message.includes("must") || message.includes("Provide") ? 400 : 500;
    return res.status(status).json({ error: message });
  }
});

router.post("/extend", async (req, res) => {
  try {
    const { filename, additionalLoops } = req.body as {
      filename?: string;
      additionalLoops?: number;
    };

    if (!filename) {
      return res.status(400).json({ error: "filename is required" });
    }

    const sourceFilename = path.basename(filename);
    const sourcePath = path.join("outputs", sourceFilename);

    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: "Source audio not found" });
    }

    const loopCount = Number(additionalLoops || 2);
    if (!Number.isInteger(loopCount) || loopCount < 1 || loopCount > 100) {
      return res.status(400).json({ error: "additionalLoops must be an integer between 1 and 100" });
    }

    const beatOptions = parseBeatOptions(req.body);

    const outputFilename = `${uuidv4()}.mp3`;
    const outputPath = path.join("outputs", outputFilename);

    await loopAudio(sourcePath, outputPath, loopCount, false, {
      ...beatOptions,
      appendSourceForBeatAlign: Boolean(beatOptions.bpm && beatOptions.beatsPerLoop),
    });

    return res.json({
      success: true,
      downloadUrl: `/api/loop/download/${outputFilename}`,
      filename: outputFilename,
    });
  } catch (error: any) {
    console.error("Extend loop error:", error);
    const message = error.message || "Failed to extend audio";
    const status = message.includes("must") || message.includes("Provide") ? 400 : 500;
    return res.status(status).json({ error: message });
  }
});

router.post("/extract-youtube", async (req, res) => {
  try {
    const { url, startTimeSeconds } = req.body as {
      url?: string;
      startTimeSeconds?: number;
    };

    if (!url) {
      return res.status(400).json({ error: "url is required" });
    }

    const start = Number(startTimeSeconds || 0);
    if (!Number.isFinite(start) || start < 0 || start > 7200) {
      return res.status(400).json({ error: "startTimeSeconds must be between 0 and 7200" });
    }

    const loopDurationSeconds = parseLoopDurationSeconds(req.body);

    const outputFilename = `${uuidv4()}.mp3`;
    const outputPath = path.join("outputs", outputFilename);

    await extractLoopFromYouTube({
      url,
      outputPath,
      startTimeSeconds: start,
      loopDurationSeconds,
    });

    return res.json({
      success: true,
      downloadUrl: `/api/loop/download/${outputFilename}`,
      filename: outputFilename,
      loopDurationSeconds,
    });
  } catch (error: any) {
    console.error("YouTube extract error:", error);
    const message = error.message || "Failed to extract loop from YouTube";
    const status =
      message.includes("must") ||
      message.includes("Provide") ||
      message.includes("Invalid YouTube URL") ||
      message.includes("unavailable") ||
      message.includes("denied direct stream access")
        ? 400
        : 500;
    return res.status(status).json({ error: message });
  }
});

router.get("/download/:filename", (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filepath = path.join("outputs", safeFilename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "File not found" });
  }

  return res.download(filepath);
});

export default router;
