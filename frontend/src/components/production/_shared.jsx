import { Badge, Box, Text } from '@chakra-ui/react'

// ── Connector-fill badge ──────────────────────────────────────────────────────
const FILL_BADGE = {
  full:    { short: 'Complet', long: 'Complet — toutes broches',     colorPalette: 'blue'   },
  empty:   { short: 'Vide',    long: 'Vide — aucune broche',         colorPalette: 'gray'   },
  partial: { short: 'Partiel', long: 'Partiel — broches partielles', colorPalette: 'orange' },
}

export function FillBadge({ fill, long = false }) {
  const b = FILL_BADGE[fill] ?? { short: fill, long: fill, colorPalette: 'gray' }
  return (
    <Badge colorPalette={b.colorPalette} variant="subtle" size="sm">
      {long ? b.long : b.short}
    </Badge>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
// `color` is a Tailwind text-color class string (e.g. 'text-slate-700')
// preserved for TechnicalStudyPage compatibility.
export function StatCard({ label, value, color = 'text-slate-700', note }) {
  return (
    <Box bg="white" rounded="xl" shadow="sm" borderWidth={1} borderColor="gray.200" p={3} textAlign="center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <Text fontSize="xs" color="gray.500" mt={0.5}>{label}</Text>
      {note && <Text fontSize="11px" color="gray.400" mt={0.5}>{note}</Text>}
    </Box>
  )
}
