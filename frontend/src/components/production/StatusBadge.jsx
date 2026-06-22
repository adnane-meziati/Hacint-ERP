import { Badge } from '@chakra-ui/react'

const STATUS_CONFIG = {
  pending:  { label: 'En attente', colorPalette: 'yellow' },
  approved: { label: 'Approuvé',   colorPalette: 'green'  },
  rejected: { label: 'Rejeté',     colorPalette: 'red'    },
  archived: { label: 'Archivé',    colorPalette: 'gray'   },
}

export default function StatusBadge({ status }) {
  const { label, colorPalette } = STATUS_CONFIG[status] ?? { label: status, colorPalette: 'gray' }
  return (
    <Badge colorPalette={colorPalette} variant="subtle" size="sm">
      {label}
    </Badge>
  )
}
