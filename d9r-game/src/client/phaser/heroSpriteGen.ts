/**
 * Hero sprite orchestrator.
 *
 * Draws each hero on a low-res 48×48 canvas (5 frames) then scales to 256×256
 * with NEAREST filter for crisp pixel art. Call generateAllHeroSprites(scene)
 * once in PreloadScene.create().
 *
 * Frame layout: 0=idle  1=attack  2=cast  3=ko  4=victory
 */
import Phaser from 'phaser';
import { PIXEL_W, PIXEL_H } from './heroes/heroPixelUtils';
import { drawSnooVanguard }  from './heroes/snooVanguard';
import { drawKarmaDuelist }  from './heroes/karmaDuelist';
import { drawFlairArchmage } from './heroes/flairArchmage';
import { drawUpvoteRanger }  from './heroes/upvoteRanger';
import { drawAwardSage }     from './heroes/awardSage';
import { drawAutomodOracle } from './heroes/automodOracle';

export const HERO_GEN_FRAME_W     = 256;
export const HERO_GEN_FRAME_H     = 256;
export const HERO_GEN_FRAME_COUNT = 5;

type DrawFn = (ctx: CanvasRenderingContext2D, frameIdx: number, ox: number) => void;

const HEROES: Array<{ id: string; draw: DrawFn }> = [
  { id: 'snoo-vanguard',  draw: drawSnooVanguard  },
  { id: 'karma-duelist',  draw: drawKarmaDuelist  },
  { id: 'flair-archmage', draw: drawFlairArchmage },
  { id: 'upvote-ranger',  draw: drawUpvoteRanger  },
  { id: 'award-sage',     draw: drawAwardSage      },
  { id: 'automod-oracle', draw: drawAutomodOracle  },
];

export function generateAllHeroSprites(scene: Phaser.Scene): void {
  for (const hero of HEROES) {
    // Draw at native pixel-art resolution
    const low = document.createElement('canvas');
    low.width  = PIXEL_W * HERO_GEN_FRAME_COUNT;
    low.height = PIXEL_H;
    const lowCtx = low.getContext('2d', { willReadFrequently: false })!;
    lowCtx.imageSmoothingEnabled = false;

    for (let i = 0; i < HERO_GEN_FRAME_COUNT; i++) {
      // Draw frame on temp canvas then stamp flipped — heroes face left
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width  = PIXEL_W;
      frameCanvas.height = PIXEL_H;
      const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: false })!;
      frameCtx.imageSmoothingEnabled = false;
      hero.draw(frameCtx, i, 0);

      lowCtx.save();
      lowCtx.translate((i + 1) * PIXEL_W, 0); // right edge of slot i
      lowCtx.scale(-1, 1);
      lowCtx.drawImage(frameCanvas, 0, 0);
      lowCtx.restore();
    }

    // Scale up to 256×256 with no interpolation → crisp pixel art
    const canvas = document.createElement('canvas');
    canvas.width  = HERO_GEN_FRAME_W * HERO_GEN_FRAME_COUNT;
    canvas.height = HERO_GEN_FRAME_H;
    const ctx = canvas.getContext('2d', { willReadFrequently: false })!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, canvas.width, canvas.height);

    const key = `hero-${hero.id}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);

    scene.textures.addSpriteSheet(
      key,
      canvas as unknown as HTMLImageElement,
      { frameWidth: HERO_GEN_FRAME_W, frameHeight: HERO_GEN_FRAME_H }
    );
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}
