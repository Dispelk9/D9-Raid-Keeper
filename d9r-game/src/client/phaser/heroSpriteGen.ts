/**
 * Procedural hero sprite generator.
 *
 * Produces a 1280×256 canvas (5 frames × 256×256) per hero using Canvas 2D.
 * Frame layout matches COMMON_HERO_POSE_COL:
 *   0 = idle   1 = attack   2 = cast   3 = ko   4 = victory
 *
 * Call generateAllHeroSprites(scene) once in PreloadScene.create().
 */
import Phaser from 'phaser';

// ── Public frame constants (used by BootScene HERO_SPRITE_CONFIG) ────────────
export const HERO_GEN_FRAME_W = 256;
export const HERO_GEN_FRAME_H = 256;
export const HERO_GEN_FRAME_COUNT = 5;

// ── Skeleton (all y values relative to ground=0, negative = upward) ──────────
const GROUND_PAD = 30;          // px from frame bottom to ground line

const LEG_H      = 44;
const LEG_W      = 18;
const LEG_SEP    = 7;           // gap between legs

const TORSO_H    = 62;
const TORSO_TW   = 50;          // width at shoulders
const TORSO_BW   = 64;          // width at hips

const NECK_H     = 5;
const HEAD_RX    = 28;
const HEAD_RY    = 24;
const ANT_STEM   = 14;
const ANT_BALL_R = 8;

// Derived positions
const HIP_Y      = -LEG_H;
const SHO_Y      = HIP_Y  - TORSO_H;          // top of torso / shoulder line
const NECK_BOT_Y = SHO_Y  - NECK_H;
const HEAD_CY    = NECK_BOT_Y - HEAD_RY;       // head centre
const ANT_ROOT_Y = HEAD_CY - HEAD_RY - 2;
const ANT_TIP_Y  = ANT_ROOT_Y - ANT_STEM;

const SHO_X      = TORSO_TW / 2;              // arm root x (mirrored per side)
const ARM_ROOT_Y = SHO_Y + 18;                // arm attaches below shoulder top
const ARM_LEN    = 38;
const ARM_W      = 10;

// ── Colour helpers ────────────────────────────────────────────────────────────
function hex(h: string, a = 1): string {
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
}

// ── Pose table ────────────────────────────────────────────────────────────────
type Pose = {
  tilt: number;         // body rotate (radians, + = CW)
  rightArm: number;     // right-arm angle from horizontal (+ = down, - = up)
  leftArm: number;
  weapon: boolean;      // draw weapon at right arm tip
  glow: boolean;        // cast glow ring
  ko: boolean;          // X eyes
  victory: boolean;     // big star burst
};

const POSES: Pose[] = [
  // 0 idle
  { tilt: 0,    rightArm:  0.5,  leftArm:  0.5,  weapon: false, glow: false, ko: false, victory: false },
  // 1 attack
  { tilt: -0.1, rightArm:  0.0,  leftArm:  0.5,  weapon: true,  glow: false, ko: false, victory: false },
  // 2 cast
  { tilt:  0,   rightArm: -0.9,  leftArm: -0.9,  weapon: false, glow: true,  ko: false, victory: false },
  // 3 ko
  { tilt:  1.3, rightArm:  0.4,  leftArm: -0.3,  weapon: false, glow: false, ko: true,  victory: false },
  // 4 victory
  { tilt:  0,   rightArm: -1.2,  leftArm: -1.2,  weapon: false, glow: false, ko: false, victory: true  },
];

// ── Hero visual definitions ───────────────────────────────────────────────────
type HeroDef = {
  id: string;
  body:  string;   // torso colour
  pants: string;   // leg colour
  glow:  string;   // cast glow hex
  ant:   string;   // antenna ball colour
  drawHat:    (ctx: CanvasRenderingContext2D) => void;
  drawWeapon: (ctx: CanvasRenderingContext2D) => void;
};

// ── Weapon draw helpers (ctx translated to arm tip, angle=0 = rightward) ─────

function wLaptop(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#334155';
  ctx.fillRect(-13, -10, 28, 20);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-10, -8, 22, 14);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-6, -3, 12, 5);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-16, 10, 32, 5);
}

function wSword(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(34, 0); ctx.stroke();
  ctx.fillStyle = '#92400e';
  ctx.fillRect(-7, -6, 14, 12);
  ctx.fillStyle = '#d97706';
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
}

function wWrench(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(26, 0); ctx.stroke();
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(28, 0, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(28, -8); ctx.lineTo(28, -14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(28,  8); ctx.lineTo(28,  14); ctx.stroke();
}

function wMagnifier(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#166534';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(22, 0, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#bbf7d0';
  ctx.globalAlpha = 0.4;
  ctx.beginPath(); ctx.arc(22, 0, 13, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.moveTo(11, 9); ctx.lineTo(-4, 22); ctx.stroke();
}

function wShield(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#0369a1';
  ctx.beginPath();
  ctx.moveTo(-1, -20); ctx.lineTo(14, -20);
  ctx.lineTo(18, -2); ctx.lineTo(6, 14); ctx.lineTo(-1, 14);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(2, -14); ctx.lineTo(11, -14);
  ctx.lineTo(13, -3); ctx.lineTo(6, 8); ctx.lineTo(2, 8);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#e0f2fe';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function wCrystal(ctx: CanvasRenderingContext2D) {
  const g = ctx.createRadialGradient(16, -6, 2, 16, 0, 16);
  g.addColorStop(0, '#fdf2f8');
  g.addColorStop(0.5, '#ec4899');
  g.addColorStop(1, '#831843');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(16, 0, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.ellipse(10, -6, 6, 4, -0.5, 0, Math.PI * 2); ctx.fill();
}

// ── Hat draw helpers (ctx translated to head centre) ─────────────────────────

function hatWizard(ctx: CanvasRenderingContext2D, brim: string, cone: string) {
  const headTop = -HEAD_RY;
  ctx.fillStyle = brim;
  ctx.beginPath(); ctx.ellipse(0, headTop + 2, 34, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(-20, headTop + 2);
  ctx.lineTo(0, headTop - 46);
  ctx.lineTo(20, headTop + 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = brim;
  ctx.beginPath(); ctx.ellipse(0, headTop - 14, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e9d5ff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('</>', 0, headTop - 26);
}

function hatHelmet(ctx: CanvasRenderingContext2D, main: string, visor: string) {
  const hTop = -HEAD_RY - 4;
  ctx.fillStyle = main;
  ctx.beginPath(); ctx.ellipse(0, hTop + 10, 32, 22, 0, Math.PI, 0); ctx.fill();
  ctx.fillRect(-30, hTop + 8, 60, 8);
  ctx.fillStyle = visor;
  ctx.fillRect(-16, hTop + 4, 32, 10);
  ctx.fillStyle = main;
  ctx.fillRect(-3, hTop - 8, 6, 18);
}

function hatHardHat(ctx: CanvasRenderingContext2D, col: string) {
  const hTop = -HEAD_RY - 2;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(0, hTop + 10, 36, 18, 0, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, hTop + 10, 40, 7, 0, 0, Math.PI * 2); ctx.fill();
}

function hatHood(ctx: CanvasRenderingContext2D, col: string, trim: string) {
  const hTop = -HEAD_RY;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-30, hTop + 14);
  ctx.quadraticCurveTo(-34, hTop - 20, 0, hTop - 36);
  ctx.quadraticCurveTo(34, hTop - 20, 30, hTop + 14);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = trim;
  ctx.beginPath(); ctx.ellipse(0, hTop + 12, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
}

function hatArmor(ctx: CanvasRenderingContext2D, main: string, visor: string) {
  const hTop = -HEAD_RY - 2;
  ctx.fillStyle = main;
  ctx.beginPath(); ctx.ellipse(0, hTop + 10, 34, 24, 0, Math.PI, 0); ctx.fill();
  ctx.fillRect(-38, hTop + 6, 16, 22);
  ctx.fillRect(22, hTop + 6, 16, 22);
  ctx.fillStyle = visor;
  ctx.fillRect(-18, hTop + 2, 36, 8);
}

function hatOracle(ctx: CanvasRenderingContext2D, col: string, star: string) {
  const hTop = -HEAD_RY;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-28, hTop + 16);
  ctx.quadraticCurveTo(-32, hTop - 28, 0, hTop - 44);
  ctx.quadraticCurveTo(32, hTop - 28, 28, hTop + 16);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = star;
  ctx.font = '20px serif';
  ctx.textAlign = 'center';
  ctx.fillText('✦', 0, hTop - 22);
}

// ── Hero definitions ──────────────────────────────────────────────────────────

const HERO_DEFS: HeroDef[] = [
  {
    id:    'snoo-vanguard',
    body:  '#7c3aed',
    pants: '#4c1d95',
    glow:  '#c4b5fd',
    ant:   '#f97316',
    drawHat:    (c) => hatWizard(c, '#5b21b6', '#6d28d9'),
    drawWeapon: wLaptop,
  },
  {
    id:    'karma-duelist',
    body:  '#dc2626',
    pants: '#7f1d1d',
    glow:  '#fca5a5',
    ant:   '#f97316',
    drawHat:    (c) => hatHelmet(c, '#991b1b', '#fca5a5'),
    drawWeapon: wSword,
  },
  {
    id:    'flair-archmage',
    body:  '#d97706',
    pants: '#78350f',
    glow:  '#fde68a',
    ant:   '#f97316',
    drawHat:    (c) => hatHardHat(c, '#b45309'),
    drawWeapon: wWrench,
  },
  {
    id:    'upvote-ranger',
    body:  '#16a34a',
    pants: '#14532d',
    glow:  '#86efac',
    ant:   '#f97316',
    drawHat:    (c) => hatHood(c, '#15803d', '#4ade80'),
    drawWeapon: wMagnifier,
  },
  {
    id:    'award-sage',
    body:  '#0891b2',
    pants: '#164e63',
    glow:  '#67e8f9',
    ant:   '#f97316',
    drawHat:    (c) => hatArmor(c, '#0e7490', '#bae6fd'),
    drawWeapon: wShield,
  },
  {
    id:    'automod-oracle',
    body:  '#db2777',
    pants: '#831843',
    glow:  '#f9a8d4',
    ant:   '#f97316',
    drawHat:    (c) => hatOracle(c, '#9d174d', '#fce7f3'),
    drawWeapon: wCrystal,
  },
];

// ── Per-frame draw ────────────────────────────────────────────────────────────

function arm(
  ctx: CanvasRenderingContext2D,
  side: 1 | -1,
  angle: number,
  bodyCol: string,
  drawWeapon?: (c: CanvasRenderingContext2D) => void
) {
  const rx = side * SHO_X;
  const tipX = rx + side * Math.cos(angle) * ARM_LEN;
  const tipY = ARM_ROOT_Y + Math.sin(angle) * ARM_LEN;

  ctx.strokeStyle = bodyCol;
  ctx.lineWidth = ARM_W;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(rx, ARM_ROOT_Y); ctx.lineTo(tipX, tipY); ctx.stroke();

  // Hand
  ctx.fillStyle = '#fde68a';
  ctx.beginPath(); ctx.arc(tipX, tipY, 7, 0, Math.PI * 2); ctx.fill();

  if (drawWeapon) {
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(side === 1 ? angle : Math.PI + angle);
    drawWeapon(ctx);
    ctx.restore();
  }
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  frameIdx: number,
  ox: number,
  h: HeroDef
) {
  const pivotX = ox + HERO_GEN_FRAME_W / 2;
  const pivotY = HERO_GEN_FRAME_H - GROUND_PAD;
  const pose   = POSES[frameIdx]!;

  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(pose.tilt);

  // ── Shadow ────────────────────────────────────────────────────────────────
  const sGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 36);
  sGrad.addColorStop(0, 'rgba(0,0,0,0.22)');
  sGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sGrad;
  ctx.beginPath(); ctx.ellipse(0, 0, 36, 10, 0, 0, Math.PI * 2); ctx.fill();

  // ── Back arm (left) ───────────────────────────────────────────────────────
  arm(ctx, -1, pose.leftArm, h.body);

  // ── Legs ──────────────────────────────────────────────────────────────────
  const lx = -(LEG_SEP / 2 + LEG_W / 2);
  const rx =   LEG_SEP / 2 + LEG_W / 2;
  ctx.fillStyle = h.pants;
  ctx.beginPath(); ctx.roundRect(lx - LEG_W / 2, HIP_Y, LEG_W, LEG_H, 4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(rx - LEG_W / 2, HIP_Y, LEG_W, LEG_H, 4); ctx.fill();

  // Boots
  ctx.fillStyle = '#1c1917';
  ctx.beginPath(); ctx.roundRect(lx - LEG_W / 2 - 2, -6, LEG_W + 4, 8, 3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(rx - LEG_W / 2 - 2, -6, LEG_W + 4, 8, 3); ctx.fill();

  // ── Torso ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = h.body;
  ctx.beginPath();
  ctx.moveTo(-TORSO_TW / 2, SHO_Y);
  ctx.lineTo( TORSO_TW / 2, SHO_Y);
  ctx.lineTo( TORSO_BW / 2, HIP_Y);
  ctx.lineTo(-TORSO_BW / 2, HIP_Y);
  ctx.closePath(); ctx.fill();

  // Chest highlight
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(-TORSO_TW / 2 + 4, SHO_Y + 4);
  ctx.lineTo( TORSO_TW / 2 - 4, SHO_Y + 4);
  ctx.lineTo( TORSO_TW / 2 - 8, SHO_Y + 22);
  ctx.lineTo(-TORSO_TW / 2 + 8, SHO_Y + 22);
  ctx.closePath(); ctx.fill();

  // Belt
  ctx.fillStyle = '#1c1917';
  ctx.beginPath(); ctx.roundRect(-TORSO_BW / 2, HIP_Y - 8, TORSO_BW, 9, 2); ctx.fill();

  // ── Front arm (right) with weapon on attack ───────────────────────────────
  arm(ctx, 1, pose.rightArm, h.body, pose.weapon ? h.drawWeapon : undefined);

  // ── Neck ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#fde68a';
  ctx.beginPath(); ctx.roundRect(-6, NECK_BOT_Y, 12, NECK_H + HEAD_RY + 2, 3); ctx.fill();

  // ── Head ──────────────────────────────────────────────────────────────────
  const hGrad = ctx.createRadialGradient(-8, HEAD_CY - 8, 4, 0, HEAD_CY, HEAD_RX);
  hGrad.addColorStop(0, '#fff7ed');
  hGrad.addColorStop(1, '#fde68a');
  ctx.fillStyle = hGrad;
  ctx.beginPath(); ctx.ellipse(0, HEAD_CY, HEAD_RX, HEAD_RY, 0, 0, Math.PI * 2); ctx.fill();

  // Head outline
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, HEAD_CY, HEAD_RX, HEAD_RY, 0, 0, Math.PI * 2); ctx.stroke();

  // Eyes
  const eyeY = HEAD_CY - 4;
  if (pose.ko) {
    // X eyes
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const xe = 9;
    ([ [-1, 1], [1, -1] ] as [number, number][]).forEach(([a, b]) => {
      ctx.beginPath(); ctx.moveTo(-xe + a * 5, eyeY + b * 5); ctx.lineTo(-xe - a * 5, eyeY - b * 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo( xe + a * 5, eyeY + b * 5); ctx.lineTo( xe - a * 5, eyeY - b * 5); ctx.stroke();
    });
  } else {
    ctx.fillStyle = '#18181b';
    ctx.beginPath(); ctx.ellipse(-9, eyeY, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 9, eyeY, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
    // Gleam
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-11, eyeY - 2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(  7, eyeY - 2, 2, 0, Math.PI * 2); ctx.fill();

    // Smile
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const smileY = HEAD_CY + 10;
    ctx.beginPath();
    ctx.moveTo(-8, smileY - 2);
    ctx.quadraticCurveTo(0, smileY + 4, 8, smileY - 2);
    ctx.stroke();

    // Rosy cheeks
    ctx.fillStyle = 'rgba(251,113,133,0.28)';
    ctx.beginPath(); ctx.ellipse(-18, HEAD_CY + 6, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 18, HEAD_CY + 6, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  }

  // ── Hat ───────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(0, HEAD_CY);
  h.drawHat(ctx);
  ctx.restore();

  // ── Antenna ───────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, ANT_ROOT_Y); ctx.lineTo(0, ANT_TIP_Y); ctx.stroke();
  const antGrad = ctx.createRadialGradient(-2, ANT_TIP_Y - 3, 1, 0, ANT_TIP_Y, ANT_BALL_R);
  antGrad.addColorStop(0, '#fed7aa');
  antGrad.addColorStop(1, h.ant);
  ctx.fillStyle = antGrad;
  ctx.beginPath(); ctx.arc(0, ANT_TIP_Y, ANT_BALL_R, 0, Math.PI * 2); ctx.fill();

  // ── Cast glow ─────────────────────────────────────────────────────────────
  if (pose.glow) {
    const r1 = 55;
    const glowCy = HEAD_CY - 10;
    const gGrad = ctx.createRadialGradient(0, glowCy, 0, 0, glowCy, r1);
    gGrad.addColorStop(0, hex(h.glow, 0.55));
    gGrad.addColorStop(0.6, hex(h.glow, 0.2));
    gGrad.addColorStop(1, hex(h.glow, 0));
    ctx.fillStyle = gGrad;
    ctx.beginPath(); ctx.arc(0, glowCy, r1, 0, Math.PI * 2); ctx.fill();

    // Sparkle ring
    ctx.strokeStyle = hex(h.glow, 0.7);
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(0, glowCy, r1 - 4, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Four sparkle stars
    const sparkles = [[0, -r1 + 2], [r1 - 2, 0], [0, r1 - 2], [-(r1 - 2), 0]];
    ctx.fillStyle = hex(h.glow, 0.9);
    sparkles.forEach(([sx, sy]) => {
      ctx.beginPath(); ctx.arc(sx!, glowCy + sy!, 4, 0, Math.PI * 2); ctx.fill();
    });
  }

  // ── Victory burst ──────────────────────────────────────────────────────────
  if (pose.victory) {
    const vCy = HEAD_CY - 20;
    const rays = 8;
    ctx.strokeStyle = hex(h.glow, 0.75);
    ctx.lineWidth = 3;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      const r0 = 40, r1 = 62;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, vCy + Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, vCy + Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.fillStyle = hex(h.glow, 0.85);
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', 0, vCy - 48);
  }

  ctx.restore();
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateAllHeroSprites(scene: Phaser.Scene): void {
  HERO_DEFS.forEach((hero) => {
    const canvas = document.createElement('canvas');
    canvas.width  = HERO_GEN_FRAME_W * HERO_GEN_FRAME_COUNT;
    canvas.height = HERO_GEN_FRAME_H;
    const ctx = canvas.getContext('2d', { willReadFrequently: false })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    for (let i = 0; i < HERO_GEN_FRAME_COUNT; i++) {
      drawFrame(ctx, i, i * HERO_GEN_FRAME_W, hero);
    }

    const key = `hero-${hero.id}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);

    scene.textures.addSpriteSheet(
      key,
      canvas as unknown as HTMLImageElement,
      { frameWidth: HERO_GEN_FRAME_W, frameHeight: HERO_GEN_FRAME_H }
    );
    scene.textures
      .get(key)
      .setFilter(Phaser.Textures.FilterMode.LINEAR);
  });
}
