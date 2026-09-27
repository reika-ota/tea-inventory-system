import type { AlertKind } from '@chaicoss/shared';

export const ALERT_LABELS: Readonly<Record<AlertKind, string>> = {
  EXPIRED: '期限切れ',
  NEAR_EXPIRY: '期限間近',
  LOW: '残りわずか',
};

/** 強調の種別ごとの色（文字色・淡色の背景）。UI設計 1.2・1.7 */
export const ALERT_COLORS: Readonly<Record<AlertKind, { color: string; bgcolor: string }>> = {
  EXPIRED: { color: 'error.main', bgcolor: 'soft.expired' },
  NEAR_EXPIRY: { color: 'warning.main', bgcolor: 'soft.near' },
  LOW: { color: 'info.main', bgcolor: 'soft.low' },
};
