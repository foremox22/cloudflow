// Generates PWA icons using the Canvas API via the `canvas` npm package.
// Run once: node scripts/gen-icons.mjs
// If `canvas` isn't installed: npm install canvas --save-dev

import { createCanvas } from "canvas";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const r = size * 0.18; // corner radius

  // Background — orange-500 gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#f97316");   // orange-500
  grad.addColorStop(1, "#ea580c");   // orange-600
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fill();

  // "RMS" text
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(size * 0.32)}px Arial`;
  ctx.fillText("RMS", size / 2, size / 2);

  return canvas.toBuffer("image/png");
}

const sizes = [
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192.png",         size: 192 },
  { name: "icon-512.png",         size: 512 },
];

for (const { name, size } of sizes) {
  const buf = drawIcon(size);
  writeFileSync(join(publicDir, name), buf);
  console.log(`✓ ${name} (${size}×${size})`);
}
console.log("Done.");
