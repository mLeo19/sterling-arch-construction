// Regenerates public/images/approach-sketch.png from the /approach hero
// photo (src/lib/data/approach.ts -> heroImage). Run with:
//   npx playwright install chromium   (first time only)
//   node scripts/bake-approach-sketch.mjs
//
// Runs once, offline, rather than live in the browser - this pixel
// processing (plus the color-dodge edge pass) is expensive enough that
// running it every scroll frame (as ApproachHero's clip-path reveal would
// require) caused visible scroll jank. See the doc comment on
// ApproachHero.tsx for the full reasoning.
//
// Two passes, combined:
//
// 1. Edge detection via the standard "color dodge" pencil-sketch recipe
//    (grayscale, invert, blur the invert, color-dodge-blend that against
//    the original grayscale), not Laplacian convolution - dodge produces a
//    single clean dark-line-on-light-ground result, where a convolution
//    kernel produces two opposite-polarity edges per line (one of which
//    gets clipped away), reading as thin/broken/muddy instead of a
//    continuous stroke.
//
// 2. Region suppression: an architect's sketch outlines a tree or a lawn,
//    it doesn't render every leaf or blade of grass - but plain edge
//    detection can't tell "window mullion" from "grass blade" by contrast
//    alone, both produce plenty of real local contrast. What actually
//    distinguishes them in this photo is color: grass and foliage are
//    green, sky is blue/bright, architecture isn't. So vegetation and sky
//    are classified directly from the source photo's own color (excess-
//    green index for vegetation; blue-dominant-or-low-saturation-and-
//    bright, restricted to the upper frame, for sky) and every edge found
//    inside those regions is suppressed outright, regardless of how strong
//    it is. Everything else (the building, pool, patio, furniture) is
//    untouched. This is also what keeps the sky completely blank rather
//    than filled with faint cloud contours.
//
// The output has no painted background at all: every kept pixel is a
// constant near-black "ink" color with alpha derived from edge strength -
// flat regions resolve to alpha 0 (fully transparent). This is what lets
// the PNG sit directly over the page's own cream background with no
// color-matching step.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE_URL =
  "https://images.unsplash.com/photo-1706808849780-7a04fbac83ef?q=80&w=2400&auto=format&fit=crop";
const OUTPUT_PATH = path.join(__dirname, "../public/images/approach-sketch.png");
const FULL_W = 2400;
const FULL_H = 1350;

// Tuned by rendering many blur/threshold/vegetation-threshold combinations
// side by side against this exact photo and picking the one that read as a
// clean architectural sketch rather than noise or a muddy wash. See the
// doc comment above for what each controls.
const PARAMS = {
  blur: 1.3,
  slope: 8,
  intercept: 7.8,
  vegThreshold: 0,
  skyYFraction: 0.42,
};

const pageScript = /* js */ `
function boxBlur(src, w, h, radius) {
  if (radius <= 0) return src;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const r = Math.max(1, Math.round(radius));
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / (2 * r + 1);
      const addX = Math.min(w - 1, x + r + 1), remX = Math.max(0, x - r);
      sum += src[y * w + addX] - src[y * w + remX];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / (2 * r + 1);
      const addY = Math.min(h - 1, y + r + 1), remY = Math.max(0, y - r);
      sum += tmp[addY * w + x] - tmp[remY * w + x];
    }
  }
  return out;
}

async function bake(params) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = params.sourceUrl;
  });
  const W = img.naturalWidth, H = img.naturalHeight;

  const src = document.createElement("canvas");
  src.width = W; src.height = H;
  const sctx = src.getContext("2d");
  sctx.drawImage(img, 0, 0);
  const d = sctx.getImageData(0, 0, W, H).data;

  const gray = new Float32Array(W * H);
  const suppressed = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    gray[i] = (r + g + b) / 3;

    const y = (i / W) | 0;
    const exg = 2 * g - r - b;
    const maxc = Math.max(r, g, b), minc = Math.min(r, g, b);
    const lightness = (maxc + minc) / 2;
    const sat = maxc === minc ? 0 : (maxc - minc) / (255 - Math.abs(maxc + minc - 255));
    const isVeg = exg > params.vegThreshold;
    const isSky =
      y < H * params.skyYFraction &&
      ((b - r > 12 && lightness > 130) || (lightness > 165 && sat < 0.12));
    suppressed[i] = isVeg || isSky ? 1 : 0;
  }

  const inv = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) inv[i] = 255 - gray[i];
  const blurredInv = boxBlur(inv, W, H, params.blur);

  const outCanvas = document.createElement("canvas");
  outCanvas.width = W; outCanvas.height = H;
  const octx = outCanvas.getContext("2d");
  const outData = octx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const base = gray[i] / 255, blend = blurredInv[i] / 255;
    const dodged = blend >= 0.999 ? 1 : Math.min(1, base / (1 - blend));
    let alpha = Math.max(0, Math.min(1, -params.slope * dodged + params.intercept));
    if (suppressed[i]) alpha = 0;
    outData.data[i * 4] = 20;
    outData.data[i * 4 + 1] = 20;
    outData.data[i * 4 + 2] = 20;
    outData.data[i * 4 + 3] = Math.round(alpha * 255);
  }
  octx.putImageData(outData, 0, 0);
  document.body.appendChild(outCanvas);
  outCanvas.id = "bake-output";
  window.__done = true;
}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: FULL_W, height: FULL_H } });
await page.setContent(`<!doctype html><html><body></body></html>`);
await page.addScriptTag({ content: pageScript });
await page.evaluate(
  (args) => window.bake(args),
  { sourceUrl: SOURCE_URL, ...PARAMS }
);
await page.waitForFunction(() => window.__done === true, { timeout: 60000 });

const buffer = await page.locator("#bake-output").screenshot({ omitBackground: true });
writeFileSync(OUTPUT_PATH, buffer);
await browser.close();

console.log(`Wrote ${OUTPUT_PATH}`);
