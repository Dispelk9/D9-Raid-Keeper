/**
 * flair-archmage — DevOps Engineer — Orange Hard-Hat Engineer
 *
 * Silhouette: dome hard-hat with wide brim, utility vest + tool belt, big wrench.
 */
import { r, rr, shadow, pixelText } from './heroPixelUtils';

// ── Palette ───────────────────────────────────────────────────────────────────
const SK  = '#f3c29d';
const SKD = '#b76d4d';
const HR  = '#78350f'; // brown hair
const HRL = '#b45309';
const OT  = '#d97706'; // amber
const OTD = '#713f12'; // dark amber
const OTL = '#fbbf24'; // bright amber
const AC  = '#22c55e'; // green accent
const ACL = '#bbf7d0';
const GL  = '#facc15'; // yellow glow
const BK  = '#18181b';
const GR  = '#9ca3af'; // grey metal

// ── Sub-draw helpers ──────────────────────────────────────────────────────────

function hardHat(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    // Dome — rounded top
    { x: 16, y:  6, w:16, h:  2, color: BK  },
    { x: 13, y:  8, w:22, h:  5, color: BK  },
    { x: 14, y:  8, w:20, h:  5, color: OT  },
    { x: 16, y:  7, w:16, h:  2, color: OTL }, // dome top
    { x: 17, y:  6, w:14, h:  1, color: OTL },
    // Safety stripe on dome
    { x: 14, y: 10, w:20, h:  2, color: OTD },
    { x: 15, y:  9, w:18, h:  1, color: GL  }, // yellow stripe
    // Brim — wider than dome
    { x:  9, y: 13, w:30, h:  2, color: BK  },
    { x: 10, y: 13, w:28, h:  1, color: OTD },
    // Bump
    { x: 21, y:  5, w: 6, h:  2, color: BK  },
    { x: 22, y:  5, w: 4, h:  2, color: OT  },
  ]);
}

function face(ctx: CanvasRenderingContext2D, ko: boolean) {
  rr(ctx, [
    { x: 13, y: 14, w:22, h: 14, color: BK  },
    { x: 14, y: 28, w:20, h:  2, color: BK  },
    // Hair (side burns, short)
    { x: 14, y: 14, w: 3, h:  6, color: HR  },
    { x: 31, y: 14, w: 3, h:  5, color: HR  },
    { x: 15, y: 14, w:18, h:  2, color: HRL },
    // Skin
    { x: 16, y: 15, w:16, h: 13, color: SK  },
    { x: 16, y: 26, w:16, h:  3, color: SKD },
    // Safety goggles on forehead
    { x: 16, y: 14, w: 6, h:  3, color: '#374151' },
    { x: 26, y: 14, w: 6, h:  3, color: '#374151' },
    { x: 22, y: 15, w: 4, h:  2, color: BK  },
    { x: 17, y: 15, w: 4, h:  2, color: AC  },
    { x: 27, y: 15, w: 4, h:  2, color: AC  },
  ]);

  if (ko) {
    rr(ctx, [
      { x: 19, y: 22, w: 1, h: 1, color: BK }, { x: 21, y: 22, w: 1, h: 1, color: BK },
      { x: 20, y: 23, w: 1, h: 1, color: BK },
      { x: 27, y: 22, w: 1, h: 1, color: BK }, { x: 29, y: 22, w: 1, h: 1, color: BK },
      { x: 28, y: 23, w: 1, h: 1, color: BK },
    ]);
  } else {
    rr(ctx, [
      { x: 19, y: 21, w: 3, h: 4, color: BK  },
      { x: 27, y: 21, w: 3, h: 4, color: BK  },
      { x: 19, y: 21, w: 1, h: 1, color: ACL },
      { x: 27, y: 21, w: 1, h: 1, color: ACL },
      { x: 21, y: 27, w: 5, h: 1, color: '#7c2d12' },
    ]);
  }
}

function body(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    // Neck
    { x: 20, y: 29, w: 8, h:  3, color: SK  },
    // Utility vest — stocky
    { x: 16, y: 31, w:16, h: 12, color: BK  },
    { x: 17, y: 31, w:14, h: 11, color: OT  },
    { x: 18, y: 32, w:12, h:  4, color: OTL }, // chest highlight
    { x: 18, y: 36, w:12, h:  6, color: OTD }, // lower vest
    // Tool belt
    { x: 16, y: 39, w:16, h:  2, color: BK  },
    { x: 17, y: 39, w:14, h:  1, color: GL  },
    // Belt pouches
    { x: 18, y: 40, w: 4, h:  3, color: OTD },
    { x: 26, y: 40, w: 4, h:  3, color: OTD },
    { x: 19, y: 41, w: 2, h:  1, color: GR  },
    { x: 27, y: 41, w: 2, h:  1, color: GR  },
    // Legs
    { x: 17, y: 43, w: 5, h:  3, color: BK  },
    { x: 26, y: 43, w: 5, h:  3, color: BK  },
    { x: 18, y: 43, w: 4, h:  2, color: OTD },
    { x: 27, y: 43, w: 4, h:  2, color: OTD },
  ]);
  pixelText(ctx, 'CI', 20, 33, ACL);
}

function arms(ctx: CanvasRenderingContext2D, pose: number) {
  const attack  = pose === 1;
  const cast    = pose === 2;
  const victory = pose === 4;

  if (cast || victory) {
    rr(ctx, [
      { x: 11, y: 28, w: 4, h: 9, color: BK  },
      { x: 12, y: 28, w: 3, h: 8, color: OT  },
      { x: 11, y: 27, w: 3, h: 2, color: SK  },
      { x: 33, y: 27, w: 4, h: 9, color: BK  },
      { x: 33, y: 27, w: 3, h: 8, color: OT  },
      { x: 33, y: 26, w: 3, h: 2, color: SK  },
    ]);
    if (cast) {
      r(ctx,  8, 24, 5, 5, GL);
      r(ctx, 35, 23, 5, 5, GL);
      r(ctx,  9, 25, 2, 2, '#ffffffaa');
      r(ctx, 36, 24, 2, 2, '#ffffffaa');
    }
    return;
  }

  rr(ctx, [
    { x: 12, y: 33, w: 4, h: 8, color: BK  },
    { x: 13, y: 33, w: 3, h: 7, color: OT  },
    { x: 13, y: 40, w: 3, h: 2, color: SK  },
    { x: 31, y: 33, w: 5, h: 8, color: BK  },
    { x: 32, y: 33, w: 4, h: 7, color: OT  },
    { x: 32, y: 40, w: 3, h: 2, color: SK  },
  ]);

  if (attack) {
    // Right arm swings wrench up
    rr(ctx, [
      { x: 33, y: 30, w: 5, h: 5, color: BK  },
      { x: 34, y: 30, w: 4, h: 4, color: OT  },
      { x: 37, y: 29, w: 2, h: 2, color: SK  },
      // Wrench
      { x: 36, y: 25, w: 3, h:10, color: GR  },
      { x: 34, y: 23, w: 7, h:  3, color: BK  },
      { x: 35, y: 23, w: 5, h:  2, color: GR  },
      { x: 34, y: 30, w: 7, h:  2, color: BK  },
      { x: 35, y: 30, w: 5, h:  2, color: GR  },
      { x: 34, y: 23, w: 2, h:  2, color: AC  },
      { x: 39, y: 23, w: 2, h:  2, color: AC  },
    ]);
  }
}

function castAura(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    { x:  8, y: 14, w: 2, h: 2, color: GL  },
    { x: 38, y: 14, w: 2, h: 2, color: GL  },
    { x: 42, y: 27, w: 2, h: 2, color: AC  },
    { x:  4, y: 27, w: 2, h: 2, color: AC  },
    { x: 21, y:  3, w: 2, h: 2, color: OTL },
    { x: 29, y:  4, w: 2, h: 2, color: OTL },
  ]);
}

function victoryStar(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    { x: 22, y: 0, w: 4, h: 6, color: GL  },
    { x: 19, y: 2, w:10, h: 2, color: GL  },
    { x: 23, y: 1, w: 2, h: 4, color: '#ffffff' },
  ]);
}

// ── Main entry ────────────────────────────────────────────────────────────────
export function drawFlairArchmage(
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
  hardHat(ctx);

  ctx.restore();
}
