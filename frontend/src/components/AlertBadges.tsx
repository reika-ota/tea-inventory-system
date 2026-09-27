import type { AlertKind } from '@chaicoss/shared';
import Box from '@mui/material/Box';
import { ALERT_COLORS, ALERT_LABELS } from './alertStyles';

const badgeSx = {
  fontSize: 11,
  fontWeight: 700,
  px: '7px',
  py: '1px',
  borderRadius: '4px',
  whiteSpace: 'nowrap',
} as const;

/** 1つのバッジ */
export function Badge({ kind }: { kind: AlertKind | 'NEXT' }) {
  const colors =
    kind === 'NEXT' ? { color: 'primary.main', bgcolor: 'soft.primary' } : ALERT_COLORS[kind];
  return (
    <Box component="span" sx={{ ...badgeSx, ...colors }}>
      {kind === 'NEXT' ? '次に使う' : ALERT_LABELS[kind]}
    </Box>
  );
}

/** 強調バッジを「期限切れ→期限間近→残りわずか」の順に並べる（UI設計 1.7） */
export function AlertBadges({
  alerts,
  next = false,
}: {
  alerts: readonly AlertKind[];
  next?: boolean;
}) {
  if (alerts.length === 0 && !next) return null;
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
      {next && <Badge kind="NEXT" />}
      {alerts.map((kind) => (
        <Badge key={kind} kind={kind} />
      ))}
    </Box>
  );
}
