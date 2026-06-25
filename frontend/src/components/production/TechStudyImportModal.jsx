import { useRef, useState } from 'react'
import { Button, Dialog } from '@chakra-ui/react'
import { importMatrix, importProjectExcel } from '../../api/client'

const CLIENT_OPTIONS = ['Aptiv', 'Yazaki', 'Lear', 'Renault', 'Stellantis', 'Sumitomo', 'Other']

function isExcelFile(name) { return /\.(xlsm|xlsx)$/i.test(name) }
function isCsvFile(name)   { return /\.csv$/i.test(name) }

export default function TechStudyImportModal({ onClose, onImported, defaultProjectName }) {
  const [file, setFile]     = useState(null)
  const [mode, setMode]     = useState(null)   // null | 'excel' | 'csv'
  const [dragging, setDragging] = useState(false)
  const [error, setError]   = useState(null)
  const fileRef = useRef(null)

  // Excel state
  const [projectName, setProjectName] = useState(defaultProjectName || '')
  const [client, setClient]           = useState(CLIENT_OPTIONS[0])
  const [comment, setComment]         = useState('')
  const [preview, setPreview]         = useState(null)
  const [result, setResult]           = useState(null)
  const [busy, setBusy]               = useState(false)

  // CSV state
  const [csvResult, setCsvResult] = useState(null)
  const [csvError, setCsvError]   = useState(null)
  const [csvBusy, setCsvBusy]     = useState(false)

  function pickFile(f) {
    if (!f) return
    setFile(f); setPreview(null); setResult(null); setError(null); setCsvResult(null); setCsvError(null)
    if (isExcelFile(f.name)) setMode('excel')
    else if (isCsvFile(f.name)) setMode('csv')
    else { setError('Format non reconnu. Utilisez .xlsm/.xlsx pour une spécification ou .csv pour la matrice.'); setMode(null) }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    pickFile(e.dataTransfer.files?.[0])
  }

  async function handlePreview() {
    if (!projectName.trim()) { setError('Le nom du projet est requis.'); return }
    setBusy(true); setError(null)
    try {
      setPreview(await importProjectExcel({ file, projectName: projectName.trim(), client, mode: 'preview', comment }))
    } catch (err) {
      setError(err?.response?.data?.error || "Erreur lors de la lecture du fichier.")
    } finally { setBusy(false) }
  }

  async function handleConfirm() {
    setBusy(true); setError(null)
    try {
      const r = await importProjectExcel({ file, projectName: projectName.trim(), client, mode: 'commit', comment })
      setResult(r); onImported?.('excel')
    } catch (err) {
      setError(err?.response?.data?.error || "Erreur lors de l'import.")
    } finally { setBusy(false) }
  }

  async function handleCsvImport() {
    setCsvBusy(true); setCsvError(null)
    try {
      const r = await importMatrix(file); setCsvResult(r); onImported?.('matrix')
    } catch (err) {
      setCsvError(err?.response?.data?.error || "Erreur lors de l'import.")
    } finally { setCsvBusy(false) }
  }

  return (
    <Dialog.Root open onOpenChange={({ open }) => !open && onClose()} placement="center" size="xl">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mx="4" maxH="92vh" display="flex" flexDirection="column">
          <Dialog.Header borderBottomWidth="1px" borderColor="gray.100">
            <Dialog.Title>Importer des données</Dialog.Title>
          </Dialog.Header>

          <Dialog.Body overflowY="auto" flex="1" spaceY="4">

            {/* File picker */}
            {!result && !csvResult && (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                <input ref={fileRef} type="file" accept=".xlsm,.xlsx,.csv" className="hidden"
                  onChange={e => pickFile(e.target.files?.[0])} />
                {file ? (
                  <div>
                    <p className="font-medium text-slate-700">📄 {file.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} Ko · cliquez pour changer</p>
                    {mode && <p className="text-xs mt-1 font-medium text-blue-600">{mode === 'excel' ? 'Spécification Board' : 'Matrice CSV'}</p>}
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-500 mb-1">Glissez un fichier ici ou cliquez pour parcourir</p>
                    <p className="text-xs text-slate-400">.xlsm / .xlsx → Spécification Board · .csv → Matrice de référence</p>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>}

            {/* Excel: form + preview */}
            {mode === 'excel' && !result && (
              <>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div><label className="label">Nom du projet</label>
                    <input className={`input ${defaultProjectName ? 'bg-slate-50 text-slate-500' : ''}`}
                      value={projectName} readOnly={!!defaultProjectName}
                      onChange={e => { if (!defaultProjectName) { setProjectName(e.target.value); setPreview(null) } }}
                      placeholder="PRJ-2026-01" /></div>
                  <div><label className="label">Client</label>
                    <select className="input" value={client} onChange={e => setClient(e.target.value)}>
                      {CLIENT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select></div>
                  <div><label className="label">Statut</label>
                    <input className="input bg-slate-50 text-slate-500" value="En attente" disabled /></div>
                  <div className="sm:col-span-3"><label className="label">Commentaire (optionnel)</label>
                    <textarea className="input resize-none" rows={2} value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Appliqué à tous les échantillons importés…" /></div>
                </div>

                {preview && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-sm">
                      <b>{preview.total}</b> échantillon(s) seront créés
                      {preview.ignored > 0 && <span className="text-amber-600"> — {preview.ignored} ligne(s) ignorée(s)</span>}
                      {preview.truncated && <span className="text-slate-400"> — aperçu limité aux 100 premières lignes</span>}
                    </div>
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b border-slate-100 text-slate-500 font-semibold text-left">
                            <th className="px-3 py-2">Ligne</th><th className="px-3 py-2">APN (Holder)</th>
                            <th className="px-3 py-2">Equipment</th><th className="px-3 py-2">Component APN</th>
                            <th className="px-3 py-2">Customer ID</th><th className="px-3 py-2">Kit</th>
                            <th className="px-3 py-2">Commentaire</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map(r => (
                            <tr key={r.row} className="border-b border-slate-50">
                              <td className="px-3 py-1.5 text-slate-400">{r.row}</td>
                              <td className="px-3 py-1.5 font-mono font-semibold">{r.apn}</td>
                              <td className="px-3 py-1.5">{r.equipment || '—'}</td>
                              <td className="px-3 py-1.5 font-mono">{r.component_apn || '—'}</td>
                              <td className="px-3 py-1.5">{r.customer_id || '—'}</td>
                              <td className="px-3 py-1.5">{r.kit || '—'}</td>
                              <td className="px-3 py-1.5 text-slate-500 max-w-[160px] truncate">{r.comments || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Excel success */}
            {result && (
              <div className="text-center py-6 space-y-2">
                <div className="text-emerald-600 text-4xl">✓</div>
                <p className="font-semibold text-slate-800">Import terminé</p>
                <p className="text-sm text-slate-600">
                  <b>{result.created_samples}</b> échantillon(s) · <b>{result.created_matrix}</b> entrée(s) matrice · <b>{result.ignored}</b> ignorée(s)
                </p>
                <p className="text-xs text-slate-400">Projet « {result.project_name} » — En attente</p>
              </div>
            )}

            {/* CSV: info + error */}
            {mode === 'csv' && !csvResult && (
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
                <p className="font-medium text-slate-600 mb-1">Colonnes attendues :</p>
                <code>reference, designation, quantity, sample_type, notes</code>
                {csvError && <p className="text-red-600 mt-2">{csvError}</p>}
              </div>
            )}

            {/* CSV success */}
            {csvResult && (
              <div className="text-center py-6 space-y-2">
                <div className="text-emerald-600 text-4xl">✓</div>
                <p className="font-semibold text-slate-800">Import matrice terminé</p>
                <p className="text-sm text-slate-600"><b>{csvResult.created}</b> créé(s), <b>{csvResult.updated}</b> mis à jour.</p>
              </div>
            )}
          </Dialog.Body>

          <Dialog.Footer borderTopWidth="1px" borderColor="gray.100">
            {(result || csvResult) ? (
              <Button colorPalette="blue" onClick={onClose}>Fermer</Button>
            ) : (
              <>
                <Button variant="outline" onClick={onClose}>Annuler</Button>
                {mode === 'excel' && (
                  !preview
                    ? <Button colorPalette="blue" onClick={handlePreview} loading={busy} loadingText="Lecture…"
                        disabled={!file || !projectName.trim()}>Aperçu</Button>
                    : <>
                        <Button variant="outline" onClick={handlePreview} disabled={busy}>Relire</Button>
                        <Button colorPalette="blue" onClick={handleConfirm} loading={busy} loadingText="Import…"
                          disabled={preview.total === 0}>Confirmer ({preview.total} échantillons)</Button>
                      </>
                )}
                {mode === 'csv' && (
                  <Button colorPalette="blue" onClick={handleCsvImport} loading={csvBusy} loadingText="Import…" disabled={!file}>
                    Importer
                  </Button>
                )}
              </>
            )}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
