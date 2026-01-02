import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { join } from "path";

const svgPath = join(process.cwd(), "public/icons/icon.svg");
const outputDir = join(process.cwd(), "public/icons");

// Ensure output directory exists
mkdirSync(outputDir, { recursive: true });

const svg = readFileSync(svgPath);

// Generate regular icons
const sizes = [192, 512];

async function generateIcons() {
  for (const size of sizes) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(join(outputDir, `icon-${size}x${size}.png`));
    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Generate maskable icons with safe zone padding (10% on each side)
  for (const size of sizes) {
    const padding = Math.floor(size * 0.1);
    const innerSize = size - padding * 2;
    
    await sharp(svg)
      .resize(innerSize, innerSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 15, g: 23, b: 42, alpha: 1 }, // #0f172a
      })
      .png()
      .toFile(join(outputDir, `icon-maskable-${size}x${size}.png`));
    console.log(`Generated icon-maskable-${size}x${size}.png`);
  }

  // Generate favicon
  await sharp(svg)
    .resize(32, 32)
    .png()
    .toFile(join(process.cwd(), "public/favicon.png"));
  console.log("Generated favicon.png");

  // Generate apple-touch-icon
  await sharp(svg)
    .resize(180, 180)
    .png()
    .toFile(join(outputDir, "apple-touch-icon.png"));
  console.log("Generated apple-touch-icon.png");
}

generateIcons().then(() => console.log("All icons generated!"));
