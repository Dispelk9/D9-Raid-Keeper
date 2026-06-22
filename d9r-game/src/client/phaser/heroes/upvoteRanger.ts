/**
 * upvote-ranger — QA Tester — Green Hooded Ranger
 *
 * Silhouette: pointed cowl-hood, sweeping cloak on right side, magnifier/bug-net.
 */
import { r, rr, shadow, pixelText } from './heroPixelUtils';

// ── Palette ───────────────────────────────────────────────────────────────────
const SK  = '#ecc3a6';
const SKD = '#a97961';
const HR  = '#14532d'; // dark green hair
const HRL = '#16a34a';
const OT  = '#16a34a'; // forest green
const OTD = '#064e3b'; // dark green
const OTL = '#4ade80'; // bright green
const AC  = '#f472b6'; // pink accent
const ACL = '#fbcfe8';
const GL  = '#86efac'; // mint glow
const BK  = '#18181b';
const LN  = '#d1fae5'; // lens

// ── Sub-draw helpers ──────────────────────────────────────────────────────────

function hood(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    // Pointed hood tip at y=4
    { x: 23, y:  4, w: 2, h:  2, color: BK  },
    { x: 22, y:  5, w: 4, h:  1, color: OT  },
    { x: 21, y:  6, w: 6, h:  2, color: OT  },
    { x: 20, y:  8, w: 8, h:  2, color: OT  },
    { x: 19, y: 10, w:10, h:  2, color: OT  },
    { x: 18, y: 12, w:12, h:  2, color: OTD },
    // Hood opening — oval frame
    { x: 13, y: 13, w:22, h:  2, color: BK  },
    { x: 13, y: 14, w: 4, h: 14, color: BK  }, // left side
    { x: 31, y: 14, w: 4, h: 10, color: BK  }, // right side
    // Hood fill — left/right sides
    { x: 14, y: 14, w: 3, h: 13, color: OTD },
    { x: 32, y: 14, w: 3, h:  9, color: OTD },
    // Cloak drape right side
    { x: 32, y: 23, w: 6, h: 16, color: BK  },
    { x: 33, y: 23, w: 5, h: 15, color: OTD },
    { x: 34, y: 24, w: 3, h: 13, color: OT  },
    // Hood trim
    { x: 15, y: 13, w:18, h:  1, color: OTL },
    // Leaf/arrow pattern on hood
    { x: 21, y:  7, w: 2, h: 1, color: OTL },
    { x: 22, y:  9, w: 2, h: 1, color: OTL },
  ]);
}

function face(ctx: CanvasRenderingContext2D, ko: boolean) {
  rr(ctx, [
    // Face area inside hood
    { x: 17, y: 15, w:14, h: 13, color: BK  },
    { x: 17, y: 28, w:14, h:  2, color: BK  },
    // Hair peek
    { x: 17, y: 15, w: 2, h:  6, color: HR  },
    { x: 29, y: 15, w: 2, h:  5, color: HR  },
    { x: 18, y: 15, w:12, h:  2, color: HRL },
    // Skin
    { x: 18, y: 17, w:12, h: 11, color: SK  },
    { x: 18, y: 26, w:12, h:  3, color: SKD },
  ]);

  if (ko) {
    rr(ctx, [
      { x: 20, y: 21, w: 1, h: 1, color: BK }, { x: 22, y: 21, w: 1, h: 1, color: BK },
      { x: 21, y: 22, w: 1, h: 1, color: BK },
      { x: 25, y: 21, w: 1, h: 1, color: BK }, { x: 27, y: 21, w: 1, h: 1, color: BK },
      { x: 26, y: 22, w: 1, h: 1, color: BK },
    ]);
  } else {
    rr(ctx, [
      { x: 20, y: 20, w: 3, h: 4, color: BK  },
      { x: 25, y: 20, w: 3, h: 4, color: BK  },
      { x: 20, y: 20, w: 1, h: 1, color: AC  },
      { x: 25, y: 20, w: 1, h: 1, color: AC  },
      { x: 21, y: 26, w: 5, h: 1, color: '#7c2d12' },
    ]);
  }
}

function body(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    // Neck
    { x: 21, y: 29, w: 6, h:  3, color: SK  },
    // Cloak body — slightly narrower (hooded look)
    { x: 17, y: 31, w:14, h: 12, color: BK  },
    { x: 18, y: 31, w:12, h: 11, color: OT  },
    { x: 19, y: 32, w:10, h:  4, color: OTL }, // chest
    { x: 19, y: 36, w:10, h:  6, color: OTD }, // lower
    // Belt
    { x: 17, y: 38, w:14, h:  1, color: AC  },
    // Arrow quiver on left
    { x: 11, y: 32, w: 4, h: 9, color: BK  },
    { x: 12, y: 32, w: 3, h: 8, color: OTD },
    { x: 12, y: 31, w: 1, h: 2, color: ACL },
    { x: 13, y: 31, w: 1, h: 2, color: ACL },
    { x: 14, y: 31, w: 1, h: 2, color: ACL },
    // Legs (slim)
    { x: 18, y: 43, w: 5, h:  3, color: BK  },
    { x: 25, y: 43, w: 5, h:  3, color: BK  },
    { x: 19, y: 43, w: 4, h:  2, color: OTD },
    { x: 26, y: 43, w: 4, h:  2, color: OTD },
  ]);
  pixelText(ctx, 'QA', 19, 33, ACL);
}

function arms(ctx: CanvasRenderingContext2D, pose: number) {
  const attack  = pose === 1;
  const cast    = pose === 2;
  const victory = pose === 4;

  if (cast || victory) {
    rr(ctx, [
      { x: 12, y: 29, w: 4, h: 9, color: BK  },
      { x: 13, y: 29, w: 3, h: 8, color: OT  },
      { x: 12, y: 28, w: 3, h: 2, color: SK  },
      { x: 31, y: 28, w: 4, h: 9, color: BK  },
      { x: 32, y: 28, w: 3, h: 8, color: OT  },
      { x: 32, y: 27, w: 3, h: 2, color: SK  },
    ]);
    if (cast) {
      r(ctx,  9, 25, 5, 5, GL);
      r(ctx, 34, 24, 5, 5, GL);
      r(ctx, 10, 26, 2, 2, '#ffffffaa');
      r(ctx, 35, 25, 2, 2, '#ffffffaa');
    }
    return;
  }

  rr(ctx, [
    { x: 12, y: 33, w: 4, h: 8, color: BK  },
    { x: 13, y: 33, w: 3, h: 7, color: OT  },
    { x: 13, y: 40, w: 3, h: 2, color: SK  },
    { x: 31, y: 33, w: 4, h: 8, color: BK  },
    { x: 31, y: 33, w: 3, h: 7, color: OT  },
    { x: 31, y: 40, w: 3, h: 2, color: SK  },
  ]);

  if (attack) {
    // Right arm extends with magnifier
    rr(ctx, [
      { x: 33, y: 30, w: 5, h: 4, color: BK  },
      { x: 34, y: 30, w: 4, h: 3, color: OT  },
      { x: 37, y: 29, w: 2, h: 2, color: SK  },
      // Magnifier circle
      { x: 35, y: 24, w: 9, h: 9, color: BK  },
      { x: 36, y: 25, w: 7, h: 7, color: OTD },
      { x: 37, y: 26, w: 5, h: 5, color: LN  },
      { x: 38, y: 27, w: 2, h: 2, color: '#ffffffaa' },
      // Handle
      { x: 40, y: 32, w: 2, h: 4, color: BK  },
      { x: 41, y: 32, w: 1, h: 3, color: OT  },
    ]);
  }
}

function castAura(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    { x:  9, y: 13, w: 2, h: 2, color: GL  },
    { x: 37, y: 13, w: 2, h: 2, color: GL  },
    { x: 41, y: 27, w: 2, h: 2, color: AC  },
    { x:  5, y: 27, w: 2, h: 2, color: AC  },
    { x: 20, y:  2, w: 2, h: 2, color: OTL },
    { x: 30, y:  3, w: 2, h: 2, color: OTL },
  ]);
}

function victoryStar(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    { x: 22, y: 1, w: 4, h: 6, color: GL  },
    { x: 19, y: 3, w:10, h: 2, color: GL  },
    { x: 23, y: 2, w: 2, h: 4, color: ACL },
  ]);
}

// ── Main entry ────────────────────────────────────────────────────────────────
export function drawUpvoteRanger(
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
  hood(ctx);

  ctx.restore();
}
