import { useRef, useState } from 'react'
import { importCsv } from '../../api/client'
import { Button, Dialog, Flex, Spinner } from '@chakra-ui/react'

export default function ImportModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef()

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.name.endsWith('.csv')) setFile(f)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await importCsv(file)
      setResult(data)
      if (data.success > 0) onSuccess()
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'importation.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={true} onOpenChange={({ open }) => !open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mx={4} maxW="lg">
          <Dialog.Header borderBottomWidth="1px" borderColor="gray.100">
            <Flex align="center" justify="space-between">
              <Dialog.Title fontWeight="semibold" color="gray.800">Importer CSV</Dialog.Title>
              <Dialog.CloseTrigger />
            </Flex>
          </Dialog.Header>

          <Dialog.Body>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files[0])}
                />
                {file ? (
                  <div>
                    <p className="font-medium text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} Ko</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-500 mb-1">Glissez un fichier CSV ici</p>
                    <p className="text-xs text-slate-400">ou cliquez pour parcourir</p>
                  </div>
                )}
              </div>

              {/* Column hint */}
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
                <p className="font-medium text-slate-600 mb-1">Colonnes attendues:</p>
                <code>apn, project, placement, received_date, client, status, description</code>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
              )}

              {result && (
                <div className={`rounded-lg p-4 text-sm ${result.errors.length === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <p className="font-medium mb-2">
                    {result.success} ligne(s) importée(s) sur {result.total} — {result.errors.length} erreur(s)
                  </p>
                  {result.errors.length > 0 && (
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                      {result.errors.map((err, i) => (
                        <li key={i} className="text-xs text-yellow-800">
                          Ligne {err.row}: {err.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </form>
          </Dialog.Body>

          <Dialog.Footer borderTopWidth="1px" borderColor="gray.100" gap={3}>
            <Button variant="outline" onClick={onClose}>
              {result ? 'Fermer' : 'Annuler'}
            </Button>
            {!result && (
              <Button
                colorPalette="blue"
                disabled={!file || loading}
                onClick={handleSubmit}
                loading={loading}
                loadingText="Importation…"
              >
                Importer
              </Button>
            )}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
