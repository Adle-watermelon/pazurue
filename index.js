import express from "express";
import puzzlesRouter from "./routes/puzzles.js";
import { pool } from "./services/db.js";
import path from "path";
import rateLimit from "express-rate-limit";
import fs from "fs"
const PORT = process.env.PORT || 3000;
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20 // 15分で20投稿
});

const app = express();

// API
app.use("/api/puzzles", uploadLimiter);
app.use("/api/puzzles", puzzlesRouter);

// 画像配信
app.use(
  "/public",
  express.static(path.resolve("public/"))
);
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/upload.html"));
});

app.get("/:puzzleId", async (req, res) => {
  const { puzzleId } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM puzzles WHERE id = $1",
      [puzzleId]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Puzzle not found");
    }

    const puzzle = result.rows[0];
    const filePath = path.join(process.cwd(), "public/puzzle.html");
    const imageUrl = `https://puzzlelab.org/ogp/${puzzleId}.jpg`;
    const pageUrl = `${req.protocol}://${req.get("host")}/${puzzleId}`;
    let html = fs.readFileSync(filePath, "utf-8");
    html = html.replaceAll("__pageUrl__", pageUrl).replaceAll("__imageUrl__",imageUrl).replaceAll("__puzzle.rows__",puzzle.rows).replaceAll("__puzzle.cols__",puzzle.cols).replaceAll("__puzzle.image_url__",puzzle.image_url);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.listen(3000, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
