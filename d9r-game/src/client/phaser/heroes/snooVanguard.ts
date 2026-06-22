/**
 * snoo-vanguard — Frontend Developer — Purple Wizard
 *
 * Silhouette: tall pointy wizard hat, narrow star-covered robe, glowing laptop.
 */
import { rr, shadow, pixelText } from './heroPixelUtils';

// ── Palette ───────────────────────────────────────────────────────────────────
const SK  = '#f0c7a8'; // skin
const SKD = '#c98c72'; // skin dark
const HR  = '#a97960'; // hair
const HRL = '#d4b09a'; // hair light
const OT  = '#7c3aed'; // outfit purple
const OTD = '#3b1a78'; // outfit dark
const AC  = '#38bdf8'; // accent sky-blue
const ACL = '#bae6fd'; // accent light
const GL  = '#a78bfa'; // glow violet
const BK  = '#1e1b4b'; // deep outline
const WT  = '#ffffff'; // white

// ── Sub-draw helpers ──────────────────────────────────────────────────────────

function hat(ctx: CanvasRenderingContext2D) {
  // Tall pointy wizard hat — tip at y=2, widens to brim at y=13
  rr(ctx, [
    { x: 23, y:  2, w: 2, h:  1, color: BK  }, // tip
    { x: 22, y:  3, w: 4, h:  1, color: OT  },
    { x: 21, y:  4, w: 6, h:  2, color: OT  },
    { x: 20, y:  6, w: 8, h:  2, color: OT  },
    { x: 19, y:  8, w:10, h:  2, color: OT  },
    { x: 18, y: 10, w:12, h:  2, color: OTD },
    // Star detail on hat
    { x: 21, y:  5, w: 1, h:  1, color: ACL },
    { x: 26, y:  8, w: 1, h:  1, color: ACL },
    { x: 20, y: 10, w: 1, h:  1, color: GL  },
    // Brim
    { x: 11, y: 12, w:26, h:  2, color: BK  },
    { x: 12, y: 12, w:24, h:  2, color: OTD },
  ]);
}

function face(ctx: CanvasRenderingContext2D, ko: boolean) {
  rr(ctx, [
    // Outline
    { x: 14, y: 13, w:20, h:  1, color: BK  },
    { x: 12, y: 14, w:24, h: 14, color: BK  },
    { x: 13, y: 28, w:22, h:  3, color: BK  },
    // Hair sides
    { x: 13, y: 14, w: 3, h: 12, color: HR  },
    { x: 32, y: 14, w: 3, h:  8, color: HR  },
    { x: 14, y: 13, w:20, h:  2, color: HRL },
    // Skin face
    { x: 16, y: 15, w:17, h: 13, color: SK  },
    { x: 16, y: 26, w:17, h:  3, color: SKD },
    // Antenna (wizard staff reflection in eye)
  ]);

  if (ko) {
    rr(ctx, [
      { x: 19, y: 22, w: 1, h: 1, color: BK }, { x: 21, y: 22, w: 1, h: 1, color: BK },
      { x: 20, y: 23, w: 1, h: 1, color: BK },
      { x: 26, y: 22, w: 1, h: 1, color: BK }, { x: 28, y: 22, w: 1, h: 1, color: BK },
      { x: 27, y: 23, w: 1, h: 1, color: BK },
    ]);
  } else {
    rr(ctx, [
      { x: 19, y: 21, w: 3, h: 4, color: BK  },
      { x: 26, y: 21, w: 3, h: 4, color: BK  },
      { x: 19, y: 21, w: 1, h: 1, color: AC  },
      { x: 26, y: 21, w: 1, h: 1, color: AC  },
      { x: 21, y: 27, w: 5, h: 1, color: '#7c2d12' },
    ]);
  }
}

function body(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    // Robe — narrow top, slight flare at bottom
    { x: 17, y: 30, w:14, h:  1, color: BK  },
    { x: 16, y: 31, w:16, h: 10, color: BK  },
    { x: 15, y: 39, w:18, h:  4, color: BK  },
    { x: 17, y: 31, w:14, h:  8, color: OT  },
    { x: 16, y: 38, w:16, h:  4, color: OTD },
    // Star decoration
    { x: 20, y: 33, w: 2, h: 2, color: GL  },
    { x: 26, y: 36, w: 2, h: 2, color: ACL },
    { x: 22, y: 38, w: 4, h: 1, color: AC  },
    // Neck
    { x: 21, y: 28, w: 6, h: 3, color: SK  },
  ]);
  pixelText(ctx, 'FE', 20, 32, ACL);
}

function armsIdle(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    { x: 13, y: 33, w: 4, h: 7, color: BK  },
    { x: 14, y: 33, w: 3, h: 6, color: OT  },
    { x: 14, y: 39, w: 3, h: 2, color: SK  },
    { x: 31, y: 33, w: 4, h: 7, color: BK  },
    { x: 31, y: 33, w: 3, h: 6, color: OT  },
    { x: 31, y: 39, w: 3, h: 2, color: SK  },
  ]);
}

function armsAttack(ctx: CanvasRenderingContext2D) {
  // Left arm down, right arm forward with laptop
  rr(ctx, [
    { x: 13, y: 33, w: 4, h: 7, color: BK  },
    { x: 14, y: 33, w: 3, h: 6, color: OT  },
    { x: 14, y: 39, w: 3, h: 2, color: SK  },
    // Right arm extended forward
    { x: 31, y: 31, w: 5, h: 4, color: BK  },
    { x: 32, y: 31, w: 4, h: 3, color: OT  },
    { x: 35, y: 30, w: 2, h: 2, color: SK  },
    // Laptop extended
    { x: 34, y: 33, w: 9, h: 6, color: '#111827' },
    { x: 35, y: 34, w: 7, h: 4, color: ACL },
    { x: 35, y: 34, w: 3, h: 2, color: AC  },
    { x: 43, y: 33, w: 1, h: 6, color: '#374151' },
  ]);
}

function armsCast(ctx: CanvasRenderingContext2D) {
  // Both arms raised up
  rr(ctx, [
    { x: 11, y: 27, w: 4, h: 8, color: BK  },
    { x: 12, y: 27, w: 3, h: 7, color: OT  },
    { x: 11, y: 26, w: 3, h: 2, color: SK  },
    { x: 32, y: 26, w: 4, h: 8, color: BK  },
    { x: 33, y: 26, w: 3, h: 7, color: OT  },
    { x: 33, y: 25, w: 3, h: 2, color: SK  },
    // Glow orbs at fingertips
    { x: 10, y: 24, w: 4, h: 4, color: GL  },
    { x: 34, y: 23, w: 4, h: 4, color: GL  },
    { x: 11, y: 25, w: 2, h: 2, color: WT  },
    { x: 35, y: 24, w: 2, h: 2, color: WT  },
  ]);
}

function armsVictory(ctx: CanvasRenderingContext2D) {
  // Both arms raised in V
  rr(ctx, [
    { x: 10, y: 28, w: 4, h: 7, color: BK  },
    { x: 11, y: 27, w: 3, h: 7, color: OT  },
    { x: 10, y: 26, w: 3, h: 2, color: SK  },
    { x: 33, y: 27, w: 4, h: 7, color: BK  },
    { x: 34, y: 26, w: 3, h: 7, color: OT  },
    { x: 34, y: 25, w: 3, h: 2, color: SK  },
  ]);
}

function castAura(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    { x:  8, y: 12, w: 2, h: 2, color: GL  },
    { x: 38, y: 13, w: 2, h: 2, color: GL  },
    { x: 40, y: 26, w: 2, h: 2, color: AC  },
    { x:  6, y: 26, w: 2, h: 2, color: AC  },
    { x: 19, y:  3, w: 2, h: 2, color: ACL },
    { x: 29, y:  4, w: 2, h: 2, color: ACL },
  ]);
}

function victoryStar(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    { x: 23, y: 0, w: 2, h: 6, color: GL  },
    { x: 20, y: 2, w: 8, h: 2, color: GL  },
    { x: 22, y: 1, w: 4, h: 4, color: ACL },
  ]);
}

// ── Main entry ────────────────────────────────────────────────────────────────
export function drawSnooVanguard(
  ctx: CanvasRenderingContext2D,
  frameIdx: number,
  ox: number
): void {
  ctx.save();
  ctx.translate(ox, 0);

  const ko = frameIdx === 3;

  shadow(ctx, 24);

  if (ko) {
    // Fallen — body flat
    rr(ctx, [
      { x: 10, y: 36, w:28, h: 6, color: BK  },
      { x: 12, y: 35, w:24, h: 6, color: OTD },
      { x: 14, y: 32, w:20, h: 6, color: SKD },
      { x: 12, y: 30, w:24, h: 5, color: HR  },
    ]);
    face(ctx, true);
    ctx.restore();
    return;
  }

  if (frameIdx === 2) castAura(ctx);
  if (frameIdx === 4) victoryStar(ctx);

  body(ctx);
  if (frameIdx === 1) armsAttack(ctx);
  else if (frameIdx === 2) armsCast(ctx);
  else if (frameIdx === 4) armsVictory(ctx);
  else armsIdle(ctx);

  face(ctx, false);
  hat(ctx);

  ctx.restore();
}
