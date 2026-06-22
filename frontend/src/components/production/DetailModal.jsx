import { useEffect, useState } from 'react'
import { getAuditLog, getSample } from '../../api/client'
import StatusBadge from './StatusBadge'
import { FillBadge } from './_shared'
import { Button, Dialog, Flex, Spinner } from '@chakra-ui/react'

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect width="300" height="300" fill="%23e2e8f0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="40" fill="%2394a3b8"%3E📷%3C/text%3E%3C/svg%3E'

function Row({ label, value }) {
  return (
    <div className="flex gap-3">
      <span className="text-slate-400 text-sm w-36 shrink-0">{label}</span>
      <span className="text-slate-700 text-sm">{value || '—'}</span>
    </div>
  )
}

export default function DetailModal({ sampleId, onClose, onEdit, onDelete }) {
  const [sample, setSample] = useState(null)
  const [audit, setAudit] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getSample(sampleId), getAuditLog(sampleId)])
      .then(([s, a]) => { setSample(s); setAudit(a) })
      .finally(() => setLoading(false))
  }, [sampleId])

  if (loading) {
    return (
      <Dialog.Root open={true}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="xs" p={8} textAlign="center">
            <Flex justify="center">
              <Spinner color="blue.600" size="md" />
            </Flex>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    )
  }

  if (!sample) return null

  const ACTION_LABELS = { create: 'Créé', update: 'Modifié', delete: 'Supprimé', import: 'Importé', export: 'Exporté' }

  return (
    <Dialog.Root open={true} onOpenChange={({ open }) => !open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mx={4} maxW="3xl" maxH="90vh" display="flex" flexDirection="column">
          <Dialog.Header borderBottomWidth="1px" borderColor="gray.100">
            <Flex align="center" justify="space-between">
              <div>
                <Dialog.Title fontWeight="semibold" color="gray.800">{sample.apn}</Dialog.Title>
                <p className="text-sm text-slate-500 mt-0.5">{sample.project}</p>
              </div>
              <Dialog.CloseTrigger ml={4} />
            </Flex>
          </Dialog.Header>

          <Dialog.Body overflowY="auto" flex={1}>
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Image */}
              <div className="sm:w-56 shrink-0">
                <img
                  src={sample.imageUrl || PLACEHOLDER}
                  alt={sample.apn}
                  className="w-full aspect-square object-cover rounded-lg bg-slate-100"
                  onError={(e) => { e.target.src = PLACEHOLDER }}
                />
              </div>

              {/* Meta */}
              <div className="flex-1 space-y-3">
                <Row label="APN" value={<span className="font-mono font-medium">{sample.apn}</span>} />
                <Row label="Projet" value={sample.project} />
                <Row label="Placement" value={<span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{sample.placement}</span>} />
                <Row label="Client" value={sample.clientDisplay || sample.client} />
                <Row label="Date de réception" value={
                  sample.received_date
                    ? new Date(sample.received_date + 'T00:00:00').toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
                    : null
                } />
                <Row label="Statut" value={<StatusBadge status={sample.status} />} />
                <Row label="Quantité" value={<span className="font-semibold text-slate-800">{sample.quantity ?? 1}</span>} />
                <Row label="État connecteur" value={<FillBadge fill={sample.connector_fill} long />} />
                {sample.description && <Row label="Description" value={sample.description} />}
                {sample.commentaire && <Row label="Commentaire" value={sample.commentaire} />}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <Row label="Créé par" value={sample.created_by?.fullName} />
                  <Row label="Date de création" value={sample.created_at ? new Date(sample.created_at).toLocaleString('fr-FR') : null} />
                  {sample.updated_by && <Row label="Modifié par" value={sample.updated_by?.fullName} />}
                </div>
              </div>
            </div>

            {audit.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-600 mb-3">Historique des modifications</h3>
                <div className="space-y-1.5">
                  {audit.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="w-36 shrink-0">{new Date(log.timestamp).toLocaleString('fr-FR')}</span>
                      <span className="font-medium text-slate-600">{log.user?.fullName}</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">{ACTION_LABELS[log.action] ?? log.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Dialog.Body>

          <Dialog.Footer borderTopWidth="1px" borderColor="gray.100" justifyContent="space-between">
            <Button variant="outline" onClick={onClose}>Fermer</Button>
            {(onEdit || onDelete) && (
              <Flex gap={3}>
                {onDelete && <Button colorPalette="red" variant="outline" onClick={() => onDelete(sample)}>Supprimer</Button>}
                {onEdit && <Button colorPalette="blue" onClick={() => onEdit(sample)}>Modifier</Button>}
              </Flex>
            )}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
