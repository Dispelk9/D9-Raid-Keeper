// Battle transition overlay — extracted from navigation.ts to stay under 500 lines
import type { GameScene } from '../scenes/GameScene';
import { FONT, H, W } from '../constants';
import { TITLE_SCREEN_KEY } from '../scenes/BootScene';
import type { RaidNode, BattleState } from '../../../shared/game/types';

export function showBattleTransition(
  scene: GameScene,
  node: RaidNode,
  battle: BattleState,
  onComplete: () => void
): void {
  const D = 62; // depth above all groups
  const cx = W / 2;
  const cy = H / 2;
  const { heroes } = battle;

  // ── Overlay ───────────────────────────────────────────────────────────
  const overlay = scene.add.rectangle(cx, cy, W, H, 0x000000, 0).setDepth(D);

  const floorLabel = scene.add
    .text(cx, cy - 100, `FLOOR  ${node.level}`, {
      fontSize: '13px',
      fontFamily: FONT.sans,
      color: '#f97316',
      letterSpacing: 6,
    })
    .setOrigin(0.5)
    .setAlpha(0)
    .setDepth(D + 1);

  // Party hero icons
  const iconSize = 52;
  const spacing = 62;
  const rowX0 = cx - ((heroes.length - 1) / 2) * spacing;
  const heroIcons = heroes.map((hero, i) => {
    const key = scene.textures.exists(scene.getHeroSpriteKey(hero.id))
      ? scene.getHeroSpriteKey(hero.id)
      : TITLE_SCREEN_KEY;
    const icon = scene.add
      .image(rowX0 + i * spacing, cy, key)
      .setDisplaySize(iconSize, iconSize)
      .setAlpha(0)
      .setDepth(D + 1);
    if (key !== TITLE_SCREEN_KEY) scene.setHeroPose(icon, hero.id, 'idle');
    return icon;
  });

  // Loading bar
  const barW2 = 180;
  const barY = cy + 90;
  const barBg = scene.add
    .rectangle(cx, barY, barW2, 4, 0x1f2937)
    .setAlpha(0)
    .setDepth(D + 1);
  const barFill = scene.add
    .rectangle(cx - barW2 / 2, barY, 0, 4, 0xf97316)
    .setOrigin(0, 0.5)
    .setAlpha(0)
    .setDepth(D + 1);
  const statusText = scene.add
    .text(cx, barY + 14, 'Preparing battle…', {
      fontSize: '9px',
      fontFamily: FONT.sans,
      color: '#6b7280',
    })
    .setOrigin(0.5)
    .setAlpha(0)
    .setDepth(D + 1);

  const allObjs: Phaser.GameObjects.GameObject[] = [
    overlay,
    floorLabel,
    ...heroIcons,
    barBg,
    barFill,
    statusText,
  ];
  const destroyAll = () => allObjs.forEach((o) => o.destroy());

  // ── Animation sequence ────────────────────────────────────────────────
  // Phase 1 — fade to solid black (180ms)
  scene.tweens.add({
    targets: overlay,
    alpha: 1,
    duration: 180,
    ease: 'Cubic.Out',
    onComplete: () => {
      // Phase 2 — fade in content (250ms)
      const fadeTargets = [floorLabel, ...heroIcons, barBg, barFill, statusText];
      scene.tweens.add({ targets: fadeTargets, alpha: 1, duration: 250 });

      // Animate bar fill over 900ms
      scene.tweens.add({
        targets: barFill,
        displayWidth: barW2,
        duration: 900,
        ease: 'Sine.InOut',
      });

      // Phase 3 — after 950ms show "BATTLE START"
      scene.time.delayedCall(950, () => {
        statusText.setText('✓  Ready').setColor('#22c55e');

        scene.time.delayedCall(420, () => {
          statusText
            .setText('⚔  BATTLE START')
            .setFontSize('12px')
            .setColor('#f97316');

          // Phase 4 — fade everything out (220ms) then launch battle
          scene.time.delayedCall(440, () => {
            scene.tweens.add({
              targets: allObjs,
              alpha: 0,
              duration: 220,
              ease: 'Cubic.In',
              onComplete: () => {
                destroyAll();
                onComplete();
              },
            });
          });
        });
      });
    },
  });
}
