const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// --- Config ---
const videosToBeLetterboxed = './originals/toLetterbox';
const videosToBeCropped = './originals/toCrop';
const outputFolder = './output';
const backgroundColor = 'black';

// --- CLI: dim <w> <h> ---
let aspectW = null, aspectH = null;
{
  const args = process.argv.slice(2);
  const i = args.indexOf('dim');
  if (i !== -1 && args[i + 1] && args[i + 2]) {
    aspectW = parseInt(args[i + 1], 10);
    aspectH = parseInt(args[i + 2], 10);
    if (!Number.isFinite(aspectW) || !Number.isFinite(aspectH) || aspectW <= 0 || aspectH <= 0) {
      console.error('Invalid dim arguments. Usage: node script.js dim 4 5');
      process.exit(1);
    }
  }
}
const hasAspect = Number.isFinite(aspectW) && Number.isFinite(aspectH);

// --- FS prep ---
if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);

// --- File lists ---
const isVid = f => /\.(mp4|mov|MOV|avi|mkv)$/.test(f);
const videoFilesToLetterBox = fs.readdirSync(videosToBeLetterboxed).filter(isVid).map(f => path.join(videosToBeLetterboxed, f));
const videoFilesToCrop      = fs.readdirSync(videosToBeCropped).filter(isVid).map(f => path.join(videosToBeCropped, f));

// --- Helpers ---
function getVideoStream(metadata) {
  if (!metadata || !Array.isArray(metadata.streams)) return null;
  return metadata.streams.find(s => s.codec_type === 'video') || null;
}

async function processVideos() {
  for (const p of videoFilesToLetterBox) {
    try { console.log('\nprocessing (letterbox):', p); await addLetterbox(p); }
    catch (e) { console.error(e); }
  }
  for (const p of videoFilesToCrop) {
    try { console.log('\nprocessing (crop):', p); await cropToAspect(p); }
    catch (e) { console.error(e); }
  }
}

// --- Letterbox to aspect (or square if none) ---
function addLetterbox(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, meta) => {
      if (err) return reject(`ffprobe error: ${err.message}`);
      const vs = getVideoStream(meta);
      if (!vs) return reject('No video stream found');

      const { width, height } = vs;
      const out = path.join(outputFolder, path.basename(videoPath));

      if (!hasAspect) {
        // fallback: square pad
        if (width === height) {
          fs.copyFile(videoPath, out, e => e ? reject(`copy error: ${e.message}`) : (console.log('Already square -> copied'), resolve()));
          return;
        }
        const size = Math.max(width, height);
        const x = Math.floor((size - width) / 2);
        const y = Math.floor((size - height) / 2);
        ffmpeg(videoPath)
          .videoFilter([`pad=${size}:${size}:${x}:${y}:${backgroundColor}`])
          .output(out)
          .on('end', () => { console.log(`Padded to square ${size}x${size}`); resolve(); })
          .on('error', e => reject(`ffmpeg error: ${e.message}`))
          .run();
        return;
      }

      // letterbox to target ratio (no scaling, only padding)
      const targetRatio = aspectW / aspectH;
      const inputRatio = width / height;

      let targetW, targetH;
      if (inputRatio > targetRatio) {
        // video is wider -> pad vertically
        targetW = width;
        targetH = Math.round(width / targetRatio);
      } else {
        // video is taller/narrower -> pad horizontally
        targetH = height;
        targetW = Math.round(height * targetRatio);
      }

      const padX = Math.floor((targetW - width) / 2);
      const padY = Math.floor((targetH - height) / 2);

      ffmpeg(videoPath)
        .videoFilter([`pad=${targetW}:${targetH}:${padX}:${padY}:${backgroundColor}`])
        .output(out)
        .on('end', () => { console.log(`Letterboxed to ${aspectW}:${aspectH} -> ${targetW}x${targetH}`); resolve(); })
        .on('error', e => reject(`ffmpeg error: ${e.message}`))
        .run();
    });
  });
}

// --- Center-crop to aspect (or square if none) ---
function cropToAspect(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, meta) => {
      if (err) return reject(`ffprobe error: ${err.message}`);
      const vs = getVideoStream(meta);
      if (!vs) return reject('No video stream found');

      const { width, height } = vs;
      const out = path.join(outputFolder, path.basename(videoPath));

      if (!hasAspect) {
        // fallback: square crop
        const size = Math.min(width, height);
        const x = Math.floor((width - size) / 2);
        const y = Math.floor((height - size) / 2);
        ffmpeg(videoPath)
          .videoFilter([`crop=${size}:${size}:${x}:${y}`])
          .output(out)
          .on('end', () => { console.log(`Cropped to square ${size}x${size}`); resolve(); })
          .on('error', e => reject(`ffmpeg error: ${e.message}`))
          .run();
        return;
      }

      // crop to target ratio (no scaling)
      const targetRatio = aspectW / aspectH;
      const inputRatio = width / height;

      let cropW, cropH;
      if (inputRatio > targetRatio) {
        // wider -> crop width
        cropH = height;
        cropW = Math.round(height * targetRatio);
      } else {
        // taller/narrower -> crop height
        cropW = width;
        cropH = Math.round(width / targetRatio);
      }

      const x = Math.floor((width - cropW) / 2);
      const y = Math.floor((height - cropH) / 2);

      ffmpeg(videoPath)
        .videoFilter([`crop=${cropW}:${cropH}:${x}:${y}`])
        .output(out)
        .on('end', () => { console.log(`Cropped to ${aspectW}:${aspectH} -> ${cropW}x${cropH}`); resolve(); })
        .on('error', e => reject(`ffmpeg error: ${e.message}`))
        .run();
    });
  });
}

// --- Run ---
processVideos();
