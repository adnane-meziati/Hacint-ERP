import { useMemo, useState } from 'react'
import { FillBadge } from './_shared'
import { Button, Flex, Spinner, Text } from '@chakra-ui/react'

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%23e2e8f0"/%3E%3Ctext x="50%25" y="55%25" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%2394a3b8"%3E📷%3C/text%3E%3C/svg%3E'

export default function SampleTable({ samples, loading, onRowClick, onEdit, onDelete }) {
  const showActions = !!(onEdit || onDelete)

  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  function toggleSort(key) {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }
  const sorted = useMemo(() => {
    if (!sort.key) return samples
    const v = s => s[sort.key]
    return [...samples].sort((a, b) => {
      const av = v(a) ?? '', bv = v(b) ?? ''
      const r = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'fr')
      return sort.dir === 'asc' ? r : -r
    })
  }, [samples, sort])

  const sortIndicator = key => (sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '')

  if (loading) {
    return (
      <Flex direction="column" align="center" justify="center" py={16} gap={3} color="gray.400">
        <Spinner color="blue.600" size="md" />
        <Text fontSize="sm">Chargement…</Text>
      </Flex>
    )
  }

  if (!samples.length) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-lg mb-1">Aucun échantillon trouvé</p>
        <p className="text-sm">
          {showActions ? 'Modifiez vos filtres ou ajoutez un nouvel échantillon.' : 'Modifiez vos filtres.'}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* ── Mobile cards (< sm) ── */}
      <div className="sm:hidden divide-y divide-slate-100">
        {sorted.map((s) => (
          <div
            key={s.id}
            className="p-4 active:bg-slate-50 transition-colors cursor-pointer"
            onClick={() => onRowClick(s)}
          >
            <div className="flex gap-3">
              <img
                src={s.thumbnailUrl || PLACEHOLDER}
                alt={s.apn}
                className="w-14 h-14 rounded-lg object-cover bg-slate-100 shrink-0"
                onError={(e) => { e.target.src = PLACEHOLDER }}
              />
              <div className="flex-1 min-w-0">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{s.apn}</p>
                  {s.serial_number != null && (
                    <span className="font-mono text-xs text-slate-400">#{s.serial_number}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{s.project}</p>
                {s.description && (
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1" title={s.description}>{s.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{s.placement}</span>
                  <span className="text-xs text-slate-500">{s.clientDisplay || s.client}</span>
                  <span className="text-xs text-slate-400">×{s.quantity ?? 1}</span>
                  <FillBadge fill={s.connector_fill} />
                </div>
                {s.received_date && (
                  <p className="text-xs text-slate-400 mt-1">
                    Reçu le {new Date(s.received_date + 'T00:00:00').toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            </div>
            {showActions && (
              <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                {onEdit && (
                  <Button
                    flex={1}
                    size="sm"
                    variant="outline"
                    colorPalette="blue"
                    onClick={() => onEdit(s)}
                  >
                    Modifier
                  </Button>
                )}
                {onDelete && (
                  <Button
                    flex={1}
                    size="sm"
                    variant="outline"
                    colorPalette="red"
                    onClick={() => onDelete(s)}
                  >
                    Supprimer
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Desktop table (≥ sm) ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm min-w-[780px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-3 py-2.5 font-medium text-slate-600 w-12">Photo</th>
              <th onClick={() => toggleSort('serial_number')} className="text-left px-3 py-2.5 font-medium text-slate-600 w-16 cursor-pointer select-none hover:text-slate-800">#Série{sortIndicator('serial_number')}</th>
              <th onClick={() => toggleSort('apn')} className="text-left px-3 py-2.5 font-medium text-slate-600 cursor-pointer select-none hover:text-slate-800">APN{sortIndicator('apn')}</th>
              <th onClick={() => toggleSort('project')} className="text-left px-3 py-2.5 font-medium text-slate-600 max-w-[160px] cursor-pointer select-none hover:text-slate-800">Projet{sortIndicator('project')}</th>
              <th className="text-left px-3 py-2.5 font-medium text-slate-600 w-24">Placement</th>
              <th onClick={() => toggleSort('client')} className="text-left px-3 py-2.5 font-medium text-slate-600 w-24 cursor-pointer select-none hover:text-slate-800">Client{sortIndicator('client')}</th>
              <th onClick={() => toggleSort('quantity')} className="text-center px-3 py-2.5 font-medium text-slate-600 w-12 cursor-pointer select-none hover:text-slate-800">Qté{sortIndicator('quantity')}</th>
              <th className="text-left px-3 py-2.5 font-medium text-slate-600 w-24">Remplissage</th>
              <th onClick={() => toggleSort('received_date')} className="text-left px-3 py-2.5 font-medium text-slate-600 w-28 cursor-pointer select-none hover:text-slate-800">Réception{sortIndicator('received_date')}</th>
              {showActions && <th className="text-right px-3 py-2.5 font-medium text-slate-600 w-28">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((s) => (
              <tr
                key={s.id}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => onRowClick(s)}
              >
                <td className="px-3 py-2.5">
                  <img
                    src={s.thumbnailUrl || PLACEHOLDER}
                    alt={s.apn}
                    className="w-9 h-9 rounded object-cover bg-slate-100"
                    onError={(e) => { e.target.src = PLACEHOLDER }}
                  />
                </td>
                <td className="px-3 py-2.5">
                  {s.serial_number != null
                    ? <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">#{s.serial_number}</span>
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                  {s.apn}
                  {s.description && (
                    <div className="font-normal text-xs text-slate-400 max-w-[220px] truncate" title={s.description}>
                      {s.description}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-slate-600 max-w-[160px] truncate">{s.project}</td>
                <td className="px-3 py-2.5">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{s.placement}</span>
                </td>
                <td className="px-3 py-2.5 text-slate-600 truncate max-w-[96px]">{s.clientDisplay || s.client}</td>
                <td className="px-3 py-2.5 text-center font-medium text-slate-700">{s.quantity ?? 1}</td>
                <td className="px-3 py-2.5"><FillBadge fill={s.connector_fill} /></td>
                <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                  {s.received_date ? new Date(s.received_date + 'T00:00:00').toLocaleDateString('fr-FR') : '—'}
                </td>
                {showActions && (
                  <td className="px-3 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {onEdit && (
                      <Button size="xs" variant="ghost" colorPalette="blue" onClick={() => onEdit(s)} mr={1}>
                        Modifier
                      </Button>
                    )}
                    {onDelete && (
                      <Button size="xs" variant="ghost" colorPalette="red" onClick={() => onDelete(s)}>
                        Supprimer
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
