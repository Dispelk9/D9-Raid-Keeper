export const W = 430;
export const H = 760;

export const HEADER_H = 52;
export const TAB_H = 46;
export const CONTENT_Y = HEADER_H + TAB_H; // 98
export const PAD = 8;

export const COLORS = {
  pageBg: 0xf4f1ea,
  headerBg: 0xfffaf2,
  fieldBg: 0xdbe7dd,
  statsBg: 0xefe7d7,
  cardBg: 0xffffff,
  border: 0xe4e4e7,
  ink: 0x18181b,
  white: 0xffffff,
  muted: 0xa1a1aa,
  track: 0xd4d4d8,

  tank: 0x0ea5e9,
  warrior: 0xf97316,
  mage: 0x7c3aed,
  ranger: 0x16a34a,
  support: 0xca8a04,
  healer: 0xdb2777,

  boss: 0xef4444,

  btnPrimary: 0x18181b,
  btnSkill: 0xf97316,
  btnUlt: 0x4f46e5,
  btnDisabled: 0xa1a1aa,
  btnGreen: 0x059669,

  hp: 0x10b981,
  charge: 0xeab308,
  damage: 0xef4444,
  heal: 0x60a5fa,
  ult: 0xfbbf24,

  rarityCommon: 0xa1a1aa,
  rarityRare: 0x0ea5e9,
  rarityEpic: 0x7c3aed,
  rarityLegendary: 0xd97706,
  rarityMythic: 0xe11d48,
} as const;

export const FONT = {
  sans: '"Inter", "Helvetica Neue", Arial, sans-serif',
  emoji: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
} as const;

export const ROLE_COLOR: Record<string, number> = {
  Tank: COLORS.tank,
  Warrior: COLORS.warrior,
  Mage: COLORS.mage,
  Ranger: COLORS.ranger,
  Support: COLORS.support,
  Healer: COLORS.healer,
};

export const RARITY_COLOR: Record<string, number> = {
  Common: COLORS.rarityCommon,
  Rare: COLORS.rarityRare,
  Epic: COLORS.rarityEpic,
  Legendary: COLORS.rarityLegendary,
  Mythic: COLORS.rarityMythic,
};
