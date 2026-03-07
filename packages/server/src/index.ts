import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import loopRouter from "./routes/loop";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/loop", loopRouter);

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "..", "..", "..", "packages", "frontend", "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "..", "..", "packages", "frontend", "dist", "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.json({ status: "ok" });
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
