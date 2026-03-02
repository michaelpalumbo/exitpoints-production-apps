const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { getLastFridayOfMonthFormatted, getShowNumber } = require("../lib/getShowNumber");

// Configuration
let concertDate = getLastFridayOfMonthFormatted()
let concertNumber = getShowNumber()
const inputFolder = './images';  // Folder containing input images
const outputFolder = `./output`; // Folder to save output images
const backgroundColor = { r: 0, g: 0, b: 0, alpha: 1 }; // Letterbox color (black)



// Parse CLI arguments
let aspectWidth = null;
let aspectHeight = null;
const args = process.argv.slice(2);
const dimIndex = args.indexOf('dim');
if (dimIndex !== -1 && args.length >= dimIndex + 3) {
  aspectWidth = parseInt(args[dimIndex + 1], 10);
  aspectHeight = parseInt(args[dimIndex + 2], 10);
}


// Ensure the output folder exists
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
}

// Get a list of image files in the folder
const imageFiles = fs.readdirSync(inputFolder)
    .filter(file => /\.(webp|JPEG|JPG|jpg|jpeg|PNG|png|gif)$/.test(file))  // Filter image files
    .map(file => path.join(inputFolder, file));

// Function to add letterboxing and make the image square without cropping
async function addLetterbox(imagePath) {
    const outputFilePath = path.join(outputFolder, path.basename(imagePath));

    try {
        const image = sharp(imagePath);
        const metadata = await image.metadata();

        if (aspectWidth && aspectHeight) {
            // Target aspect ratio
            const targetRatio = aspectWidth / aspectHeight;
            const inputRatio = metadata.width / metadata.height;

            let targetWidth, targetHeight;
            if (inputRatio > targetRatio) {
                // Wider than target, match width
                targetWidth = metadata.width;
                targetHeight = Math.round(metadata.width / targetRatio);
            } else {
                // Taller than target, match height
                targetHeight = metadata.height;
                targetWidth = Math.round(metadata.height * targetRatio);
            }

            const extendLeft = Math.floor((targetWidth - metadata.width) / 2);
            const extendRight = Math.ceil((targetWidth - metadata.width) / 2);
            const extendTop = Math.floor((targetHeight - metadata.height) / 2);
            const extendBottom = Math.ceil((targetHeight - metadata.height) / 2);

            await image
                .extend({
                top: extendTop,
                bottom: extendBottom,
                left: extendLeft,
                right: extendRight,
                background: backgroundColor
                })
                .toFile(outputFilePath);

            console.log(
                `Image ${path.basename(imagePath)} letterboxed to ${aspectWidth}:${aspectHeight} ratio.`
        )} else {

            if (metadata.width === metadata.height) {
                // If the image is already square, just copy it to the output folder
                await image.toFile(outputFilePath);
                console.log(`Image ${path.basename(imagePath)} is already square.`);
            } else {
                const size = Math.max(metadata.width, metadata.height);

                await image
                    .extend({
                        top: Math.floor((size - metadata.height) / 2),
                        bottom: Math.ceil((size - metadata.height) / 2),
                        left: Math.floor((size - metadata.width) / 2),
                        right: Math.ceil((size - metadata.width) / 2),
                        background: backgroundColor
                    })
                    .toFile(outputFilePath);

                console.log(`Image ${path.basename(imagePath)} letterboxed to square dimensions.`);
            }
        } 
    }   catch (err) {
        console.error(`Error processing image ${path.basename(imagePath)}:`, err);
    }
}

// Process each image in the folder
imageFiles.forEach(imagePath => {
    addLetterbox(imagePath);
});
