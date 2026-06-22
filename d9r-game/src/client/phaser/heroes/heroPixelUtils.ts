/** Shared pixel-art primitives for all hero draw files. */

export const PIXEL_W = 48;
export const PIXEL_H = 48;

export type PixelRect = { x: number; y: number; w: number; h: number; color: string };

export const r = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string
) => {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
};

export const rr = (ctx: CanvasRenderingContext2D, rects: PixelRect[]) => {
  for (const p of rects) r(ctx, p.x, p.y, p.w, p.h, p.color);
};

export const shadow = (ctx: CanvasRenderingContext2D, cx = 24) => {
  r(ctx, cx - 10, 43, 20, 2, '#00000033');
  r(ctx, cx -  7, 42, 14, 1, '#00000022');
};

// 3×5 pixel font glyphs (col-major: each string is a row of 3 cells)
const G: Record<string, string[]> = {
  A: ['111','101','111','101','101'],
  B: ['110','101','110','101','110'],
  C: ['111','100','100','100','111'],
  D: ['110','101','101','101','110'],
  E: ['111','100','110','100','111'],
  F: ['111','100','110','100','100'],
  I: ['111','010','010','010','111'],
  Q: ['111','101','101','111','001'],
  S: ['111','100','111','001','111'],
};

export const pixelText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  color: string
) => {
  for (let ci = 0; ci < text.length; ci++) {
    const glyph = G[text[ci] ?? ''];
    if (!glyph) continue;
    for (let row = 0; row < glyph.length; row++) {
      const line = glyph[row] ?? '';
      for (let col = 0; col < line.length; col++) {
        if (line[col] === '1') r(ctx, x + ci * 4 + col, y + row, 1, 1, color);
      }
    }
  }
};
