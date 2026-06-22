/**
 * automod-oracle — Data Engineer — Pink Oracle / Mystic
 *
 * Silhouette: triple-prong crystal crown, wide flowing robes, glowing data-orb.
 */
import { r, rr, shadow, pixelText } from './heroPixelUtils';

// ── Palette ───────────────────────────────────────────────────────────────────
const SK  = '#efc4a7';
const SKD = '#aa735d';
const HR  = '#831843'; // deep crimson hair
const HRL = '#db2777';
const OT  = '#db2777'; // magenta
const OTD = '#831843'; // dark magenta
const OTL = '#f472b6'; // light pink
const AC  = '#60a5fa'; // sky blue
const ACL = '#dbeafe';
const GL  = '#f9a8d4'; // pink glow
const BK  = '#18181b';
const CR  = '#e879f9'; // crystal purple-pink
const CRL = '#fdf4ff'; // crystal light

// ── Sub-draw helpers ──────────────────────────────────────────────────────────

function crown(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    // Triple prong crown
    // Center prong (tallest)
    { x: 22, y:  1, w: 4, h:  2, color: BK  },
    { x: 23, y:  1, w: 2, h:  9, color: CR  },
    { x: 23, y:  2, w: 1, h:  4, color: CRL },
    // Left prong
    { x: 15, y:  4, w: 2, h:  2, color: BK  },
    { x: 16, y:  4, w: 1, h:  6, color: CR  },
    { x: 16, y:  4, w: 1, h:  3, color: CRL },
    // Right prong
    { x: 31, y:  4, w: 2, h:  2, color: BK  },
    { x: 31, y:  4, w: 1, h:  6, color: CR  },
    { x: 31, y:  4, w: 1, h:  3, color: CRL },
    // Crown band
    { x: 13, y: 10, w:22, h:  3, color: BK  },
    { x: 14, y: 10, w:20, h:  2, color: OT  },
    { x: 15, y: 10, w:18, h:  1, color: OTL },
    // Gem connectors
    { x: 14, y:  9, w: 3, h:  2, color: AC  },
    { x: 31, y:  9, w: 3, h:  2, color: AC  },
    { x: 21, y:  9, w: 6, h:  2, color: CR  },
  ]);
}

function face(ctx: CanvasRenderingContext2D, ko: boolean) {
  rr(ctx, [
    // Head outline
    { x: 12, y: 12, w:24, h: 16, color: BK  },
    { x: 13, y: 28, w:22, h:  3, color: BK  },
    // Hair — long flowing sides
    { x: 13, y: 12, w: 4, h: 14, color: HR  },
    { x: 31, y: 12, w: 4, h: 12, color: HR  },
    { x: 14, y: 12, w:20, h:  3, color: HRL }, // top
    // Skin face
    { x: 16, y: 14, w:16, h: 14, color: SK  },
    { x: 16, y: 26, w:16, h:  4, color: SKD },
    // Ornate eye make-up / liner
    { x: 16, y: 14, w: 4, h: 1, color: AC }, // left liner
    { x: 28, y: 14, w: 4, h: 1, color: AC }, // right liner
  ]);

  if (ko) {
    rr(ctx, [
      { x: 19, y: 21, w: 1, h: 1, color: BK }, { x: 21, y: 21, w: 1, h: 1, color: BK },
      { x: 20, y: 22, w: 1, h: 1, color: BK },
      { x: 26, y: 21, w: 1, h: 1, color: BK }, { x: 28, y: 21, w: 1, h: 1, color: BK },
      { x: 27, y: 22, w: 1, h: 1, color: BK },
    ]);
  } else {
    rr(ctx, [
      { x: 19, y: 20, w: 3, h: 4, color: BK  },
      { x: 26, y: 20, w: 3, h: 4, color: BK  },
      { x: 19, y: 20, w: 1, h: 1, color: AC  },
      { x: 26, y: 20, w: 1, h: 1, color: AC  },
      { x: 21, y: 26, w: 5, h: 1, color: '#7c2d12' },
      // Lip gloss
      { x: 21, y: 26, w: 6, h: 1, color: OTL },
    ]);
  }
}

function body(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    // Neck
    { x: 20, y: 30, w: 8, h:  3, color: SK  },
    // Wide flowing robes
    { x: 13, y: 32, w:22, h: 12, color: BK  },
    { x: 14, y: 32, w:20, h: 11, color: OT  },
    { x: 15, y: 32, w:18, h:  4, color: OTL }, // chest
    { x: 15, y: 36, w:18, h:  7, color: OTD }, // lower robe
    // Wide robe flare
    { x: 12, y: 40, w:24, h:  4, color: BK  },
    { x: 13, y: 40, w:22, h:  3, color: OTD },
    // Robe trim
    { x: 14, y: 39, w:20, h:  1, color: AC  },
    { x: 12, y: 43, w:24, h:  1, color: ACL },
    // Magic sigils on robe
    { x: 18, y: 37, w: 2, h: 2, color: CR  },
    { x: 28, y: 37, w: 2, h: 2, color: CR  },
    { x: 22, y: 40, w: 4, h: 1, color: AC  },
  ]);
  pixelText(ctx, 'DB', 20, 33, ACL);
}

function arms(ctx: CanvasRenderingContext2D, pose: number) {
  const attack  = pose === 1;
  const cast    = pose === 2;
  const victory = pose === 4;

  if (cast || victory) {
    rr(ctx, [
      { x: 10, y: 29, w: 4, h: 9, color: BK  },
      { x: 11, y: 29, w: 3, h: 8, color: OT  },
      { x: 10, y: 28, w: 3, h: 2, color: SK  },
      { x: 33, y: 28, w: 4, h: 9, color: BK  },
      { x: 34, y: 28, w: 3, h: 8, color: OT  },
      { x: 34, y: 27, w: 3, h: 2, color: SK  },
    ]);
    if (cast) {
      // Crystal orb pulses in both hands
      r(ctx,  7, 24, 6, 6, CR);
      r(ctx, 35, 23, 6, 6, CR);
      r(ctx,  8, 25, 3, 3, CRL);
      r(ctx, 36, 24, 3, 3, CRL);
    }
    return;
  }

  rr(ctx, [
    { x: 11, y: 34, w: 4, h: 8, color: BK  },
    { x: 12, y: 34, w: 3, h: 7, color: OT  },
    { x: 12, y: 41, w: 3, h: 2, color: SK  },
    { x: 33, y: 34, w: 4, h: 8, color: BK  },
    { x: 33, y: 34, w: 3, h: 7, color: OT  },
    { x: 33, y: 41, w: 3, h: 2, color: SK  },
  ]);

  if (attack) {
    // Right arm extends with data orb
    rr(ctx, [
      { x: 34, y: 31, w: 5, h: 4, color: BK  },
      { x: 35, y: 31, w: 4, h: 3, color: OT  },
      { x: 38, y: 30, w: 2, h: 2, color: SK  },
      // Orb
      { x: 36, y: 24, w: 9, h: 9, color: BK  },
      { x: 37, y: 25, w: 7, h: 7, color: CR  },
      { x: 38, y: 26, w: 5, h: 5, color: OTD },
      { x: 38, y: 26, w: 3, h: 3, color: CRL },
      // Data streams
      { x: 37, y: 30, w: 1, h: 3, color: AC  },
      { x: 39, y: 31, w: 1, h: 2, color: AC  },
      { x: 41, y: 30, w: 1, h: 3, color: GL  },
    ]);
  }
}

function castAura(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    { x:  7, y: 12, w: 2, h: 2, color: CR  },
    { x: 39, y: 12, w: 2, h: 2, color: CR  },
    { x: 41, y: 27, w: 2, h: 2, color: GL  },
    { x:  5, y: 27, w: 2, h: 2, color: GL  },
    { x: 20, y:  1, w: 2, h: 2, color: CRL },
    { x: 30, y:  2, w: 2, h: 2, color: CRL },
  ]);
}

function victoryStar(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    { x: 22, y: 0, w: 4, h: 5, color: CR  },
    { x: 19, y: 2, w:10, h: 2, color: CR  },
    { x: 23, y: 1, w: 2, h: 3, color: CRL },
  ]);
}

// ── Main entry ────────────────────────────────────────────────────────────────
export function drawAutomodOracle(
  ctx: CanvasRenderingContext2D,
  frameIdx: number,
  ox: number
): void {
  ctx.save();
  ctx.translate(ox, 0);
  shadow(ctx, 24);

  if (frameIdx === 3) {
    rr(ctx, [
      { x: 10, y: 36, w:28, h: 6, color: BK  },
      { x: 12, y: 35, w:24, h: 6, color: OTD },
      { x: 14, y: 32, w:20, h: 6, color: SKD },
      { x: 13, y: 30, w:22, h: 5, color: HR  },
    ]);
    face(ctx, true);
    ctx.restore();
    return;
  }

  if (frameIdx === 2) castAura(ctx);
  if (frameIdx === 4) victoryStar(ctx);

  body(ctx);
  arms(ctx, frameIdx);
  face(ctx, false);
  crown(ctx);

  ctx.restore();
}
