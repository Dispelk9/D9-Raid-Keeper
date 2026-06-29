/**
 * Creates standalone mini-boss textures from the security_secretary.png spritesheet.
 * Secretary = floors 1-3 non-final encounters, Security = floors 4-6 non-final encounters.
 * Frame layout (2 cols × 3 rows, 512×512 each, left-right top-bottom):
 *   0 = Secretary  1 = Security  2-5 = additional poses
 */
import Phaser from 'phaser';
import {
  MINI_BOSS_SECRETARY_KEY,
  MINI_BOSS_SECURITY_KEY,
} from '../../shared/game/data/raidBosses';

export const MINI_BOSS_SPRITES_KEY = 'security-secretary-sprites';

// Frame indices within the spritesheet
const SECRETARY_FRAME = 0;
const SECURITY_FRAME  = 1;

function createTextureFromFrame(
  scene: Phaser.Scene,
  key: string,
  sheetKey: string,
  frameIndex: number
): void {
  if (!scene.textures.exists(sheetKey)) return;

  const texture  = scene.textures.get(sheetKey);
  const frame    = texture.get(frameIndex);
  const srcImage = texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;

  const canvas  = document.createElement('canvas');
  canvas.width  = frame.realWidth;
  canvas.height = frame.realHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: false })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    srcImage,
    frame.cutX, frame.cutY, frame.realWidth, frame.realHeight,
    0, 0, frame.realWidth, frame.realHeight
  );

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function generateMiniBossSprites(scene: Phaser.Scene): void {
  createTextureFromFrame(scene, MINI_BOSS_SECRETARY_KEY, MINI_BOSS_SPRITES_KEY, SECRETARY_FRAME);
  createTextureFromFrame(scene, MINI_BOSS_SECURITY_KEY,  MINI_BOSS_SPRITES_KEY, SECURITY_FRAME);
}
