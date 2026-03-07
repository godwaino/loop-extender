import { Router } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { loopAudio } from "../services/ffmpegLoop";

const router = Router();

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

router.post("/", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const loopCount = parseInt(req.body.loopCount || "3", 10);
    if (loopCount < 1 || loopCount > 100) {
      return res.status(400).json({ error: "loopCount must be between 1 and 100" });
    }

    const outputFilename = `${uuidv4()}.mp3`;
    const outputPath = path.join("outputs", outputFilename);

    await loopAudio(req.file.path, outputPath, loopCount);

    res.json({
      success: true,
      downloadUrl: `/api/loop/download/${outputFilename}`
    });
  } catch (error: any) {
    console.error("Loop error:", error);
    res.status(500).json({ error: error.message || "Failed to process audio" });
  }
});

router.get("/download/:filename", (req, res) => {
  const filepath = path.join("outputs", req.params.filename);
  res.download(filepath);
});

export default router;
