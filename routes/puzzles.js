import express from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../services/db.js";
import { saveImage } from "../services/image.js";
import path from "path";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { rows, cols } = req.body;
    const file = req.file;

    if (!file || !rows || !cols) {
      return res.status(400).json({ error: "invalid request" });
    }

    const r = Number(rows);
    const c = Number(cols);

    if (r < 1 || r > 20 || c < 1 || c > 20) {
      return res.status(400).json({ error: "invalid split size" });
    }
    const allowedTypes = ["image/jpeg", "image/png"];

    if (!allowedTypes.includes(file.mimetype)) {
    throw new Error("Invalid file type");
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".jpg", ".jpeg", ".png"].includes(ext)) {
    throw new Error("Invalid extension");
    }

    const puzzleId = uuidv4();

    // ① 画像保存
    const imageUrl = await saveImage(file, puzzleId,r,c);
    const shareUrl = `${req.protocol}://${req.get("host")}/${puzzleId}`;
    const previewUrl = `https://puzzlelab.org/ogp/${puzzleId}.jpg`;
    // ② DB INSERT
    await pool.query(
      `INSERT INTO puzzles (id, image_url, rows, cols)
       VALUES ($1, $2, $3, $4)`,
      [puzzleId, imageUrl, r, c]
    );

    res.json({
      id: puzzleId,
      imageUrl,
      shareUrl,
      previewUrl,
      rows: r,
      cols: c
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

export default router;
