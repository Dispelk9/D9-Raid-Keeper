/**
 * Procedural pixel-art mini-boss sprites.
 * Secretary = floors 1-3 non-final encounters (office worker, navy blazer, clipboard)
 * Security  = floors 4-6 non-final encounters (guard, dark uniform, gold badge)
 *
 * Drawn at 48×48 → upscaled to 128×128 (NEAREST filter, crisp pixel art).
 */
import Phaser from 'phaser';
import { r } from './heroes/heroPixelUtils';
import {
  MINI_BOSS_SECRETARY_KEY,
  MINI_BOSS_SECURITY_KEY,
} from '../../shared/game/data/raidBosses';

const NATIVE = 48;
export const MINI_BOSS_SIZE = 128;

// ── Secretary ─────────────────────────────────────────────────────────────────
// Navy blazer office worker with glasses and a clipboard.
function drawSecretary(ctx: CanvasRenderingContext2D): void {
  const SK  = '#f2cba8'; // skin
  const HR  = '#2a1505'; // dark brown hair
  const BZ  = '#1d3e8f'; // navy blazer
  const SKT = '#0c1e5e'; // dark navy skirt
  const WH  = '#f9f9f9'; // white shirt collar
  const BK  = '#151515'; // outline
  const GL  = '#93c5fd'; // glasses lens tint
  const LIP = '#dc7070'; // lips
  const CB  = '#b85c0a'; // clipboard border (amber)
  const PP  = '#fffbeb'; // clipboard paper (cream)
  const LN  = '#a8b0b8'; // lines on paper

  // Ground shadow
  r(ctx, 13, 46, 22, 2, '#00000028');

  // === Hair bun ===
  r(ctx, 21, 2, 6,  4, HR);  // bun top
  r(ctx, 19, 4, 10, 4, HR);  // bun body
  // Hair band across head
  r(ctx, 14, 8, 20, 5, HR);

  // === Head outline + face ===
  r(ctx, 13, 9,  22, 1, BK);
  r(ctx, 12, 10, 24, 13, BK); // sides + interior
  r(ctx, 13, 23, 22, 1, BK);
  // Hair on sides (inside outline)
  r(ctx, 13, 10, 2, 12, HR);
  r(ctx, 33, 10, 2, 12, HR);
  // Skin face
  r(ctx, 15, 10, 18, 12, SK);

  // === Glasses ===
  r(ctx, 15, 15, 7, 3, BK);   // left frame
  r(ctx, 16, 16, 5, 1, GL);   // left lens
  r(ctx, 22, 16, 4, 1, BK);   // bridge
  r(ctx, 26, 15, 7, 3, BK);   // right frame
  r(ctx, 27, 16, 5, 1, GL);   // right lens

  // Lips
  r(ctx, 20, 21, 8, 1, LIP);

  // === Neck ===
  r(ctx, 21, 24, 6, 3, SK);

  // === Blazer body ===
  r(ctx, 11, 27, 26, 12, BZ);
  // White collar strip in centre
  r(ctx, 20, 27, 8, 11, WH);
  // Lapel edges
  r(ctx, 19, 27, 1, 12, BZ);
  r(ctx, 27, 27, 1, 12, BZ);

  // === Skirt (wider than blazer) ===
  r(ctx,  9, 39, 30, 4, SKT);
  r(ctx,  7, 43, 34, 4, SKT);

  // === Ankles / lower leg ===
  r(ctx, 14, 46, 5, 2, SK);
  r(ctx, 29, 46, 5, 2, SK);

  // === Shoes (black pointed) ===
  r(ctx, 12, 47, 8, 1, BK);
  r(ctx, 28, 47, 8, 1, BK);

  // === Clipboard (right hand, beside body) ===
  r(ctx, 36, 27, 8, 13, CB);  // border
  r(ctx, 37, 28, 6, 11, PP);  // paper
  // Written lines
  r(ctx, 37, 30, 6, 1, LN);
  r(ctx, 37, 33, 6, 1, LN);
  r(ctx, 37, 36, 6, 1, LN);
  r(ctx, 37, 39, 4, 1, LN);
  // Top clip
  r(ctx, 39, 25, 4, 3, BK);
}

// ── Security ──────────────────────────────────────────────────────────────────
// Dark uniform guard with flat-top cap and gold badge.
function drawSecurity(ctx: CanvasRenderingContext2D): void {
  const SK  = '#f2cba8'; // skin
  const CP  = '#0f172a'; // cap (very dark navy)
  const UN  = '#1e293b'; // uniform body (dark blue-gray)
  const UNL = '#263548'; // uniform highlight
  const BD  = '#f59e0b'; // badge gold
  const BK  = '#0c0c0c'; // outline
  const BE  = '#374151'; // belt
  const BT  = '#080808'; // boots

  // Ground shadow
  r(ctx, 13, 46, 22, 2, '#00000028');

  // === Cap (flat-top military) ===
  r(ctx, 17, 2, 14,  5, CP);  // cap crown
  r(ctx, 10, 6, 28,  4, CP);  // full brim
  r(ctx,  8, 7, 32,  3, CP);  // brim front extension

  // === Head outline + face ===
  r(ctx, 12, 10, 24,  1, BK);
  r(ctx, 11, 11, 26, 13, BK);
  r(ctx, 12, 24, 24,  1, BK);
  // Skin face
  r(ctx, 12, 11,  2, 13, CP); // sideburn left
  r(ctx, 34, 11,  2, 13, CP); // sideburn right
  r(ctx, 14, 11, 20, 13, SK);

  // Eyes (stern, heavy brow)
  r(ctx, 15, 15,  5,  1, '#7a6050'); // left brow
  r(ctx, 28, 15,  5,  1, '#7a6050'); // right brow
  r(ctx, 16, 17,  4,  2, BK);        // left eye
  r(ctx, 28, 17,  4,  2, BK);        // right eye

  // Mouth (flat, serious)
  r(ctx, 19, 22, 10,  1, '#7a5040');

  // === Neck ===
  r(ctx, 20, 25,  8,  3, SK);

  // === Uniform body (wide, imposing) ===
  r(ctx,  9, 28, 30, 13, UN);
  // Shoulder highlights
  r(ctx,  9, 28, 30,  2, UNL);

  // === Badge (gold star on chest, centred) ===
  r(ctx, 19, 31, 10, 10, BD);   // badge background
  r(ctx, 21, 29,  6, 14, BD);   // vertical bar
  r(ctx, 18, 33, 12,  4, BD);   // horizontal bar
  r(ctx, 22, 33,  4,  4, '#fff7e0'); // centre highlight

  // === Belt ===
  r(ctx,  9, 41, 30,  4, BE);
  // Buckle
  r(ctx, 21, 41,  6,  4, BD);

  // === Pants (dark) ===
  r(ctx, 12, 45, 24,  3, CP);

  // === Boots ===
  r(ctx, 10, 46, 10,  2, BT);
  r(ctx, 28, 46, 10,  2, BT);
}

// ── Generator ─────────────────────────────────────────────────────────────────
function makeMiniBossSprite(
  scene: Phaser.Scene,
  key: string,
  drawFn: (ctx: CanvasRenderingContext2D) => void
): void {
  // Draw at native pixel-art resolution
  const low = document.createElement('canvas');
  low.width  = NATIVE;
  low.height = NATIVE;
  const lowCtx = low.getContext('2d', { willReadFrequently: false })!;
  lowCtx.imageSmoothingEnabled = false;
  drawFn(lowCtx);

  // Upscale to display size (NEAREST via Phaser filter)
  const canvas = document.createElement('canvas');
  canvas.width  = MINI_BOSS_SIZE;
  canvas.height = MINI_BOSS_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: false })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, MINI_BOSS_SIZE, MINI_BOSS_SIZE);

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addSpriteSheet(
    key,
    canvas as unknown as HTMLImageElement,
    { frameWidth: MINI_BOSS_SIZE, frameHeight: MINI_BOSS_SIZE }
  );
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function generateMiniBossSprites(scene: Phaser.Scene): void {
  makeMiniBossSprite(scene, MINI_BOSS_SECRETARY_KEY, drawSecretary);
  makeMiniBossSprite(scene, MINI_BOSS_SECURITY_KEY,  drawSecurity);
}
