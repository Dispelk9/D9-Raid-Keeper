/**
 * award-sage — Security Engineer — Blue Armored Knight
 *
 * Silhouette: full round helmet with T-visor slot, wide shoulder pauldrons, kite shield.
 */
import { r, rr, shadow, pixelText } from './heroPixelUtils';

// ── Palette ───────────────────────────────────────────────────────────────────
const SK  = '#e8bea2';
const SKD = '#9f6a58';
const OT  = '#0891b2'; // cyan armor
const OTD = '#164e63'; // dark teal armor
const OTL = '#38bdf8'; // light cyan
const AC  = '#f97316'; // orange accent
const ACL = '#fed7aa';
const GL  = '#67e8f9'; // ice glow
const BK  = '#18181b';
const SL  = '#e2e8f0'; // silver visor
const MT  = '#94a3b8'; // matte steel

// ── Sub-draw helpers ──────────────────────────────────────────────────────────

function helmet(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    // Full round helmet — wider than face
    { x: 12, y:  7, w:24, h:  3, color: BK  },
    { x:  9, y: 10, w:30, h: 17, color: BK  },
    { x: 11, y: 29, w:26, h:  3, color: BK  },
    // Helmet fill
    { x: 10, y:  8, w:28, h:  2, color: OT  },
    { x: 10, y: 10, w:28, h: 17, color: OT  },
    { x: 12, y: 28, w:24, h:  2, color: OTD },
    // Helmet top highlight
    { x: 14, y:  8, w:20, h:  2, color: OTL },
    // T-visor — horizontal slit
    { x: 12, y: 17, w:24, h:  3, color: BK  },
    { x: 13, y: 18, w:22, h:  1, color: SL  },
    // T-visor — vertical nasal bar
    { x: 22, y: 17, w: 4, h: 12, color: BK  },
    { x: 23, y: 18, w: 2, h: 10, color: MT  },
    // Chin guard
    { x: 13, y: 27, w:22, h:  4, color: OTD },
    // Crest / plume holder
    { x: 22, y:  5, w: 4, h:  4, color: BK  },
    { x: 23, y:  5, w: 2, h:  4, color: AC  },
    // Cheek plates
    { x: 10, y: 20, w: 3, h:  8, color: OTD },
    { x: 35, y: 20, w: 3, h:  8, color: OTD },
  ]);
}

function body(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    // Pauldrons — wide shoulder plates
    { x:  9, y: 31, w: 9, h:  6, color: BK  },
    { x: 10, y: 31, w: 8, h:  5, color: OT  },
    { x: 10, y: 31, w: 8, h:  2, color: OTL },
    { x: 30, y: 31, w: 9, h:  6, color: BK  },
    { x: 30, y: 31, w: 8, h:  5, color: OT  },
    { x: 30, y: 31, w: 8, h:  2, color: OTL },
    // Chest armor — wide
    { x: 16, y: 31, w:16, h: 12, color: BK  },
    { x: 17, y: 31, w:14, h: 11, color: OT  },
    { x: 18, y: 32, w:12, h:  4, color: OTL }, // breastplate
    { x: 18, y: 36, w:12, h:  6, color: OTD },
    // Armor joint lines
    { x: 17, y: 36, w:14, h:  1, color: AC  },
    { x: 17, y: 40, w:14, h:  1, color: AC  },
    // Greaves
    { x: 17, y: 43, w: 5, h:  3, color: BK  },
    { x: 26, y: 43, w: 5, h:  3, color: BK  },
    { x: 18, y: 43, w: 4, h:  2, color: OT  },
    { x: 27, y: 43, w: 4, h:  2, color: OT  },
  ]);
  pixelText(ctx, 'SE', 20, 33, ACL);
}

function arms(ctx: CanvasRenderingContext2D, pose: number) {
  const attack  = pose === 1;
  const cast    = pose === 2;
  const victory = pose === 4;

  if (cast || victory) {
    rr(ctx, [
      { x: 10, y: 28, w: 5, h: 9, color: BK  },
      { x: 11, y: 28, w: 4, h: 8, color: OT  },
      { x: 10, y: 27, w: 4, h: 2, color: SK  },
      { x: 33, y: 27, w: 5, h: 9, color: BK  },
      { x: 34, y: 27, w: 4, h: 8, color: OT  },
      { x: 34, y: 26, w: 4, h: 2, color: SK  },
    ]);
    if (cast) {
      r(ctx,  7, 24, 5, 5, GL);
      r(ctx, 36, 23, 5, 5, GL);
      r(ctx,  8, 25, 2, 2, '#ffffffaa');
      r(ctx, 37, 24, 2, 2, '#ffffffaa');
    }
    return;
  }

  rr(ctx, [
    { x: 11, y: 34, w: 5, h: 8, color: BK  },
    { x: 12, y: 34, w: 4, h: 7, color: OT  },
    { x: 12, y: 41, w: 4, h: 2, color: SK  },
    { x: 32, y: 34, w: 5, h: 8, color: BK  },
    { x: 32, y: 34, w: 4, h: 7, color: OT  },
    { x: 32, y: 41, w: 4, h: 2, color: SK  },
  ]);

  if (attack) {
    // Right arm thrusts shield forward
    rr(ctx, [
      { x: 33, y: 31, w: 6, h: 5, color: BK  },
      { x: 34, y: 31, w: 5, h: 4, color: OT  },
      { x: 38, y: 30, w: 2, h: 2, color: SK  },
      // Kite shield
      { x: 36, y: 26, w: 9, h:13, color: BK  },
      { x: 37, y: 27, w: 7, h:11, color: OT  },
      { x: 38, y: 28, w: 5, h:  4, color: OTL },
      { x: 40, y: 33, w: 2, h:  3, color: OTD },
      // Shield emblem
      { x: 39, y: 30, w: 3, h: 2, color: AC  },
      { x: 40, y: 29, w: 1, h: 4, color: AC  },
    ]);
  }
}

function castAura(ctx: CanvasRenderingContext2D) {
  rr(ctx, [
    { x:  7, y: 12, w: 2, h: 2, color: GL  },
    { x: 39, y: 12, w: 2, h: 2, color: GL  },
    { x: 42, y: 28, w: 2, h: 2, color: OTL },
    { x:  4, y: 28, w: 2, h: 2, color: OTL },
    { x: 21, y:  3, w: 2, h: 2, color: ACL },
    { x: 29, y:  4, w: 2, h: 2, color: ACL },
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
export function drawAwardSage(
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
      { x: 12, y: 29, w:24, h: 5, color: OTD },
    ]);
    ctx.restore();
    return;
  }

  if (frameIdx === 2) castAura(ctx);
  if (frameIdx === 4) victoryStar(ctx);

  body(ctx);
  arms(ctx, frameIdx);
  // Knight has no exposed face — helmet covers all
  helmet(ctx);

  ctx.restore();
}
