// Single source of truth for our icon name/size pairs, shared by gen-icon-sources.ts,
// gen-tex.ts, and gen-xlp.ts so the two lists never drift apart from each other.
export const civilizationIconSizes = [22, 30, 32, 36, 44, 45, 48, 50, 64, 80, 128, 256] as const;
export const leaderIconSizes = [32, 45, 48, 50, 55, 64, 80, 256] as const;

export const civilizationIconName = (civilizationId: string, size: number): string =>
  `ICON_CIVILIZATION_${civilizationId}_${size}`;

export const leaderIconName = (leaderId: string, size: number): string => `ICON_LEADER_${leaderId}_${size}`;
