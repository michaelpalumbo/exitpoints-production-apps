#!/usr/bin/env node

// build-concert.js
// Step 1: For a given concert number, read artist images from the prep folder,
// letterbox them to 4:5 with black background, and export web-sized versions
// to the website repo.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const concertDates = require('./concertDates.json')
const cpx = require("cpx");

const { getLastFridayOfMonthFormatted, getShowNumber, getTimestampForFilename } = require("../lib/getShowNumber");

// ====== CONFIG ======

let concertDate = getLastFridayOfMonthFormatted()
let concertNumber = getShowNumber()

if(process.argv[2]){
    concertNumber = Number(process.argv[2])
    
    concertDate = concertDates.find(item => item.number === concertNumber).date
}


// Absolute paths based on your setup
const PREP_ROOT = "/Users/michaelpalumbo/Dropbox/__Exit_Points/Concerts";
const SITE_ROOT = "/Users/michaelpalumbo/exitpoints-website";
const PREP_CODE_ROOT = "/Users/michaelpalumbo/Dropbox/__Exit_Points/__ExitPointsPrepCode";

const concertsJsonPath = path.join(SITE_ROOT, "public", "data", "concerts.json");
const backupsDir = path.join(SITE_ROOT, "concert-backups");

const MAX_DIMENSION = 800;      // max width/height for web
const JPEG_QUALITY = 80;         // tweak 60–85 depending on how aggressive you want

// Background colour for letterboxing (black)
const backgroundColor = { r: 0, g: 0, b: 0, alpha: 1 }; // Letterbox color (black)



// // ====== PATHS ======

// const inputDir = path.join(PREP_ROOT, `EP${String(concertNumber)}`, "announcement post");
// const outputDir = path.join(
//   SITE_ROOT,
//   "public",
//   "media",
//   "concerts",
//   String(concertNumber),
//   "artists"
// );

// // ====== CHECK / CREATE DIRECTORIES ======

// // Ensure input dir exists
// if (!fs.existsSync(inputDir)) {
//   console.error(`Input directory does not exist:\n  ${inputDir}`);
// //   process.exit(1);
// }

// // Ensure output dir exists (create recursively if needed)
// if (!fs.existsSync(outputDir)) {
//   fs.mkdirSync(outputDir, { recursive: true });
//   console.log(`Created output directory:\n  ${outputDir}`);
// }

// // Ensure backup directory exists
// if (!fs.existsSync(backupsDir)) {
//   fs.mkdirSync(backupsDir, { recursive: true });
// }

// ⭐ NEW: look up the date for a concert number (fallback to default style if missing)
function getConcertDateForNumber(concertNumber) {
  const found = concertDates.find((item) => item.number === concertNumber);
  if (found && found.date) return found.date;

  return "no date";
}

// ====== GET IMAGE FILES ======

const IMAGE_EXT_RE = /\.(webp|jpe?g|png|gif)$/i;



function getImageFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((file) => IMAGE_EXT_RE.test(file))
    .map((file) => path.join(dir, file));
}
// Function to add letterboxing and make the image square without cropping
async function processImageToWebPortrait(imagePath, outputDir) {
  const filename = path.basename(imagePath);
  const outputFilePath = path.join(outputDir, filename);

  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    const width = metadata.width;
    const height = metadata.height;

    if (!width || !height) {
      console.error(`Skipping ${filename}: could not read dimensions.`);
      return;
    }

    let pipeline = image;

    if (width === height) {
      // Already square: no letterboxing needed
    } else {
      // Letterbox to square
      const size = Math.max(width, height);

      const extendTop = Math.floor((size - height) / 2);
      const extendBottom = Math.ceil((size - height) / 2);
      const extendLeft = Math.floor((size - width) / 2);
      const extendRight = Math.ceil((size - width) / 2);

      pipeline = pipeline.extend({
        top: extendTop,
        bottom: extendBottom,
        left: extendLeft,
        right: extendRight,
        background: backgroundColor
      });

      console.log(`Image ${filename} letterboxed to square dimensions.`);
    }

    
    // At this point, image is square (or was already).
    // Decide final size: downscale if larger than MAX_DIMENSION.
    // pipeline = pipeline.resize({
    //     width: MAX_DIMENSION,
    //     height: MAX_DIMENSION,
    //     fit: "inside",           // fit inside the square
    //     background: { r: 0, g: 0, b: 0, alpha: 0 },  // transparent padding
    //     withoutEnlargement: false
    // });

    // Simple compression: re-encode based on original extension
    const ext = path.extname(filename).toLowerCase();


    if (ext === ".png") {
      // If transparency isn't important, you *could* switch to jpeg/webp instead.
      pipeline = pipeline.png({
        compressionLevel: 9,   // max PNG compression
        adaptiveFiltering: true
      });
    } else if (ext === ".webp") {
      pipeline = pipeline.webp({
        quality: JPEG_QUALITY
      });
    } else {
      // default: jpeg (covers .jpg, .jpeg, unknowns)
      pipeline = pipeline.jpeg({
        quality: JPEG_QUALITY,
        mozjpeg: true
      });
    }


    await pipeline.toFile(outputFilePath);

  } catch (err) {
    console.error(`Error processing image ${filename}:`, err);
  }
}

async function copyPoster(concertNumber) {
    const srcPosterPath = `/Users/michaelpalumbo/Dropbox/__Exit_Points/Concerts/EP${concertNumber}/EP${concertNumber}_poster.png`;
    const destDir = `/Users/michaelpalumbo/exitpoints-website/public/media/concerts/${concertNumber}/`;
    cpx.copySync(srcPosterPath, destDir)

    const thumbnail = `/Users/michaelpalumbo/exitpoints-website/public/media/concerts/${concertNumber}/EP${concertNumber}_poster_thumbnail.png`
    const width = 300
    try {

    await sharp(srcPosterPath)
        .resize({ width })                // resize to thumbnail width
        .jpeg({ quality: 70 })            // compress to 70% quality (adjust as needed)
        .toFile(thumbnail);

        console.log(`Thumbnail created: ${destDir}`);
    } catch (err) {
        console.error("Error creating thumbnail:", err);
    }

}


// ====== PER-CONCERT BUILD FUNCTION ======

// ⭐ NEW: all concert-specific work is here
async function buildConcert(concertNumber, concertDate) {
    console.log(`\n=== Building concert ${concertNumber} (${concertDate}) ===`);

    // Per-concert paths
    const inputDir = path.join(
        PREP_ROOT,
        `EP${String(concertNumber)}`,
        "announcement post"
    );
    const outputDir = path.join(
        SITE_ROOT,
        "public",
        "media",
        "concerts",
        String(concertNumber),
        "artists"
    );

    // Ensure input dir exists
    if (!fs.existsSync(inputDir)) {
        console.error(`Input directory does not exist:\n  ${inputDir}. Skipping.`);
        // return; // don't crash entire range, just skip
    }else {
        // Ensure output dir exists (create recursively if needed)
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`Created output directory:\n  ${outputDir}`);
        }

        // Ensure backup directory exists
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }

        console.log(`Input images from:\n  ${inputDir}`);
        console.log(`Output web images to:\n  ${outputDir}\n`);

        const imageFiles = getImageFiles(inputDir);
        if (imageFiles.length === 0) {
            console.warn("No image files found in input directory.");
        } else {
            await Promise.all(
            imageFiles.map((inputPath) =>
                processImageToWebPortrait(inputPath, outputDir)
            )
            );

            console.log(
            `\nDone processing ${imageFiles.length} images for concert ${concertNumber}.\n`
            );
        }

        await copyPoster(concertNumber);
    }

    
}

// // ====== generate new concerts.json ======

// // 1. Backup existing concerts.json
// if (!fs.existsSync(concertsJsonPath)) {
//   console.error(`concerts.json not found at: ${concertsJsonPath}`);
//   process.exit(1);
// }

// const backupTimestamp = getTimestampForFilename();
// const backupFilename = `concerts-backup-${backupTimestamp}.json`;
// const backupPath = path.join(backupsDir, backupFilename);

// fs.copyFileSync(concertsJsonPath, backupPath);
// console.log(`Backed up concerts.json → ${backupPath}`);

// // 2. Load concerts.json
// let concertsDataRaw = fs.readFileSync(concertsJsonPath, "utf8");
// let concertsData;

// try {
//   concertsData = JSON.parse(concertsDataRaw);
// } catch (err) {
//   console.error("Error parsing concerts.json:", err.message);
//   process.exit(1);
// }

// if (!concertsData.concerts || !Array.isArray(concertsData.concerts)) {
//   concertsData.concerts = [];
// }

// const concerts = concertsData.concerts;

// // Find existing concert by number (e.g. 66, 67, etc.)
// let concert = concerts.find((c) => c.number === concertNumber);

// // Create a new base object if it doesn't exist
// if (!concert) {
//   console.log(`No existing entry for concert #${concertNumber}. Creating a new one.`);
//   concert = {
//     number: concertNumber,
//     slug: `concert${concertNumber}`,
//     title: `Exit Points ${concertNumber}`,
//     date: getLastFridayOfMonthFormatted(),   // you can fill these via another script or here
//     doorsTime: "7:30pm",
//     showTime: "8pm Sharp",
//     venue: {
//       name: "Arraymusic",
//       address: "155 Walnut Ave",
//       city: "Toronto",
//       country: "Canada",
//       accessibilityNote: "Step-free entrance; gender-neutral washrooms."
//     },
//     poster: {
//       imageUrl: "",
//       alt: "",
//       credit: ""
//     },
//     ticket: {
//       url: "",
//       label: "Buy tickets",
//       provider: ""
//     },
//     artists: [],
//     archive: {
//       socialPosts: [],
//       documentation: {
//         photos: [],
//         videos: []
//       },
//       album: {
//         status: "none",
//         note: "",
//         bandcampUrl: null,
//         subvertUrl: null,
//         releaseDate: null
//       }
//     }
//   };

//   concerts.push(concert);
// } else {
//   console.log(`Found existing entry for concert #${concertNumber}. Updating it.`);
// }

// // Optional: keep concerts sorted by number
// concerts.sort((a, b) => a.number - b.number);

// // Write updated concerts.json
// fs.writeFileSync(concertsJsonPath, JSON.stringify(concertsData, null, 2));
// console.log(`Updated concerts.json for concert #${concertNumber}`);


// ====== MAIN RUNNER ======

// async function run() {
//     const args = process.argv.slice(2);
//   console.log(`\nBuilding concert ${concertNumber}`);
//   console.log(`Input images from:\n  ${inputDir}`);
//   console.log(`Output web images to:\n  ${outputDir}\n`);

//   const imageFiles = getImageFiles(inputDir);
//   if (imageFiles.length === 0) {
//     console.warn("No image files found in input directory.");
//     return;
//   }

//   await Promise.all(
//     imageFiles.map((inputPath) => {
//       const filename = path.basename(inputPath);
//       const outputPath = path.join(outputDir, filename);
//       return processImageToWebPortrait(inputPath, outputPath);
//     })

    
//   );
  
//   console.log(`\nDone processing ${imageFiles.length} images for concert ${concertNumber}.\n`);

//   copyPoster()
  
// }

// ====== CLI HANDLER ======

// ⭐ NEW: this replaces the old top-level `run()` call
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No args → use defaults (your old behaviour)
    const date = getConcertDateForNumber(defaultConcertNumber);
    await buildConcert(defaultConcertNumber, date);
    return;
  }

  if (args.length === 1) {
    // Single concert number
    const concertNumber = Number(args[0]);
    if (Number.isNaN(concertNumber)) {
      console.error("Please provide a valid concert number.");
      process.exit(1);
    }
    const date = getConcertDateForNumber(concertNumber);
    await buildConcert(concertNumber, date);
    return;
  }

  if (args.length === 2) {
    // Range: start end
    const start = Number(args[0]);
    const end = Number(args[1]);

    if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
      console.error("Usage: build-concert.js <start> <end>");
      console.error("Example: build-concert.js 33 66");
      process.exit(1);
    }

    for (let n = start; n <= end; n++) {
      const date = getConcertDateForNumber(n);
      try {
        await buildConcert(n, date);
      } catch (err) {
        console.error(`Error while building concert ${n}:`, err);
      }
    }

    console.log("\n✨ Finished processing range.");
    return;
  }

  // Too many args
  console.error("Usage:");
  console.error("  build-concert.js                 # uses default show");
  console.error("  build-concert.js <concertNumber>");
  console.error("  build-concert.js <start> <end>   # inclusive range");
  process.exit(1);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

