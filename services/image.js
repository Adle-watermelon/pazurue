import fs from "fs";
import path from "path";
import sharp from "sharp";
import 'dotenv/config';
import {
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
const R2_BUCKET_NAME = "puzzlee";

// S3クライアントの初期化
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SERCRET_ACCESS_KEY,
  },
});
export async function saveImage(file, puzzleId, rows, cols) {
    const _outputPath = `images/${puzzleId}.jpg`
    const _ogpPath = `ogp/${puzzleId}.jpg`
    // sharpでリサイズ＆JPEG化
    const imageBuffer = await sharp(file.buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside" })
    .jpeg({ quality: 85 })
    .toBuffer();


    // R2にアップロード
    await s3Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: _outputPath,
    Body: imageBuffer,          // ← ここにsharpで作ったバッファを直接
    ContentType: "image/jpeg",  // JPEGなのでpngではなく
    }));
    /* =========================
        ② シャッフルOGP生成
    ========================= */
    const resizedImage = sharp(imageBuffer);
    const meta = await resizedImage.metadata();
    const width = meta.width;
    const height = meta.height;

    const pieceW = Math.floor(width / cols);
    const pieceH = Math.floor(height / rows);

    // ピースの位置配列を作成してシャッフル
    const positions = [];
    for (let i = 0; i < rows * cols; i++) {
        positions.push(i);
  }
  
  // Fisher-Yatesシャッフル
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // 各ピースを切り出してシャッフル位置に配置
  const compositeInputs = [];
  
  for (let i = 0; i < rows * cols; i++) {
    const originalIndex = positions[i];
    
    // 元の位置
    const origRow = Math.floor(originalIndex / cols);
    const origCol = originalIndex % cols;
    
    // 新しい位置
    const newRow = Math.floor(i / cols);
    const newCol = i % cols;
    
    // ピースを切り出し
    const piece = await sharp(imageBuffer)
      .extract({
        left: origCol * pieceW,
        top: origRow * pieceH,
        width: pieceW,
        height: pieceH
      })
      .toBuffer();
    
    compositeInputs.push({
      input: piece,
      left: newCol * pieceW,
      top: newRow * pieceH
    });
  }

  // シャッフルされた画像を合成
  const ogpBuffer = await sharp({
    create: {
      width: width,
      height: height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
    .composite(compositeInputs)
    .jpeg({ quality: 85 })
    .toBuffer();
  await s3Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: _ogpPath,
    Body: ogpBuffer,          // ← ここにsharpで作ったバッファを直接
    ContentType: "image/jpeg",  // JPEGなのでpngではなく
  }));

  return `https://puzzlelab.org/images/${puzzleId}.jpg`;
}