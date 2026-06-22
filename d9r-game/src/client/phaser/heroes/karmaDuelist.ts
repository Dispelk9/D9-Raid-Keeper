/**
 * karma-duelist — Backend Developer — Red Samurai
 *
 * Silhouette: wide flat kabuto helmet with ear-guards, layered armor, long katana.
 */
import { r, rr, shadow, pixelText } from './heroPixelUtils';

// ── Palette ───────────────────────────────────────────────────────────────────
const SK  = '#f2c5a7';
const SKD = '#b97962';
const HR  = '#1a1a1a';
const OT  = '#dc2626'; // crimson armor
const OTD = '#7f1d1d'; // dark armor
const OTL = '#ef4444'; // light armor highlight
const AC  = '#facc15'; // gold accent
const ACL = '#fef9c3'; // pale gold
const BK  = '#0f0f0f';
const BL  = '#94a3b8'; // blade silver

// ── Sub-draw helpers ──────────────────────────────────────────────────────────

function kabuto(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    // Helmet dome — flat-topped, wide
    { x: 10, y:  8, w:28, h:  2, color: BK  },
    { x:  9, y: 10, w:30, h:  6, color: BK  },
    { x: 10, y:  9, w:28, h:  6, color: OT  },
    { x: 11, y:  9, w:26, h:  2, color: OTL }, // top highlight
    // Ear-guards flaring out
    { x:  7, y: 11, w: 3, h:  7, color: BK  },
    { x:  8, y: 12, w: 2, h:  6, color: OTD },
    { x: 38, y: 11, w: 3, h:  7, color: BK  },
    { x: 38, y: 12, w: 2, h:  6, color: OTD },
    // Neck-guard (shikoro)
    { x: 11, y: 16, w:26, h:  2, color: BK  },
    { x: 12, y: 16, w:24, h:  1, color: OTD },
    // Gold crest (maedate) top center
    { x: 22, y:  6, w: 4, h:  4, color: BK  },
    { x: 23, y:  6, w: 2, h:  4, color: AC  },
    { x: 23, y:  5, w: 2, h:  2, color: ACL },
    // Visor slit
    { x: 15, y: 14, w:18, h:  2, color: BK  },
  ]);
}

function face(ctx: CanvasRenderingContext2D, ko: boolean) {
  rr(ctx, [
    // Outline
    { x: 13, y: 17, w:22, h: 12, color: BK  },
    { x: 14, y: 29, w:20, h:  2, color: BK  },
    // Skin
    { x: 14, y: 18, w:20, h: 11, color: SK  },
    { x: 15, y: 27, w:18, h:  3, color: SKD },
    // Hair side-burns
    { x: 14, y: 18, w: 2, h:  8, color: HR  },
    { x: 32, y: 18, w: 2, h:  6, color: HR  },
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
      { x: 19, y: 21, w: 1, h: 1, color: AC  },
      { x: 27, y: 21, w: 1, h: 1, color: AC  },
      { x: 21, y: 27, w: 5, h: 1, color: '#7c2d12' },
    ]);
  }
}

function body(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    // Neck
    { x: 20, y: 30, w: 8, h:  3, color: SK  },
    // Chest armor — layered plate feel
    { x: 15, y: 32, w:18, h: 11, color: BK  },
    { x: 16, y: 32, w:16, h: 10, color: OT  },
    { x: 17, y: 33, w:14, h:  3, color: OTL }, // chest highlight plate
    { x: 17, y: 36, w:14, h:  6, color: OTD }, // lower plate
    // Armor trim lines
    { x: 16, y: 36, w:16, h:  1, color: AC  },
    { x: 16, y: 40, w:16, h:  1, color: AC  },
    // Legs / hakama (wide pants)
    { x: 16, y: 42, w: 6, h:  3, color: BK  },
    { x: 26, y: 42, w: 6, h:  3, color: BK  },
    { x: 17, y: 42, w: 5, h:  2, color: OTD },
    { x: 27, y: 42, w: 5, h:  2, color: OTD },
    // Shoulder pauldrons
    { x: 12, y: 32, w: 5, h:  5, color: BK  },
    { x: 13, y: 32, w: 4, h:  4, color: OTD },
    { x: 31, y: 32, w: 5, h:  5, color: BK  },
    { x: 31, y: 32, w: 4, h:  4, color: OTD },
  ]);
  pixelText(ctx, 'BE', 20, 34, ACL);
}

function arms(ctx: CanvasRenderingContext2D, pose: number) {
  const attack  = pose === 1;
  const cast    = pose === 2;
  const victory = pose === 4;

  if (cast || victory) {
    rr(ctx, [
      { x: 10, y: 28, w: 4, h: 8, color: BK  },
      { x: 11, y: 28, w: 3, h: 7, color: OT  },
      { x: 10, y: 27, w: 3, h: 2, color: SK  },
      { x: 33, y: 28, w: 4, h: 8, color: BK  },
      { x: 34, y: 27, w: 3, h: 8, color: OT  },
      { x: 34, y: 26, w: 3, h: 2, color: SK  },
    ]);
    if (cast) {
      // Chi energy from hands
      r(ctx,  8, 24, 4, 4, AC);
      r(ctx, 36, 23, 4, 4, AC);
      r(ctx,  9, 25, 2, 2, '#ffffff88');
      r(ctx, 37, 24, 2, 2, '#ffffff88');
    }
    return;
  }

  // Default arms
  rr(ctx, [
    { x: 12, y: 34, w: 4, h: 7, color: BK  },
    { x: 13, y: 34, w: 3, h: 6, color: OT  },
    { x: 13, y: 40, w: 3, h: 2, color: SK  },
    { x: 31, y: 34, w: 4, h: 7, color: BK  },
    { x: 31, y: 34, w: 3, h: 6, color: OT  },
    { x: 32, y: 40, w: 3, h: 2, color: SK  },
  ]);

  if (attack) {
    // Right arm thrusts sword forward
    rr(ctx, [
      { x: 33, y: 31, w: 5, h: 4, color: BK  },
      { x: 34, y: 31, w: 4, h: 3, color: OT  },
      { x: 37, y: 30, w: 2, h: 2, color: SK  },
      // Katana blade — long slash going right
      { x: 36, y: 28, w: 2, h:14, color: BK  },
      { x: 37, y: 28, w: 1, h:13, color: BL  },
      { x: 36, y: 40, w: 4, h: 2, color: AC  }, // guard
      { x: 35, y: 41, w: 6, h: 1, color: ACL },
      // Flash
      { x: 37, y: 26, w: 1, h: 2, color: '#ffffff' },
    ]);
  }
}

function castAura(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    { x: 8,  y: 14, w: 2, h: 2, color: AC  },
    { x: 38, y: 15, w: 2, h: 2, color: AC  },
    { x: 41, y: 28, w: 2, h: 2, color: OTL },
    { x:  5, y: 28, w: 2, h: 2, color: OTL },
  ]);
}

function victoryStar(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    { x: 22, y: 1, w: 4, h: 6, color: AC  },
    { x: 19, y: 3, w:10, h: 2, color: AC  },
    { x: 23, y: 2, w: 2, h: 4, color: ACL },
  ]);
}

// ── Main entry ────────────────────────────────────────────────────────────────
export function drawKarmaDuelist(
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
      { x: 11, y: 30, w:26, h: 5, color: HR  },
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
  kabuto(ctx);

  ctx.restore();
}
