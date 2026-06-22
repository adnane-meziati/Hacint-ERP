import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Dialog, NativeSelect, Spinner } from '@chakra-ui/react'
import {
  deleteDesignFile, deleteDesignPdf, deleteBomPdf,
  getProjects, getSamples, markDone, setDesignerStatus, uploadDesign, uploadBomFile,
  getBomItems, createBomItem, updateBomItem, deleteBomItem,
} from '../../api/client'
import Jimide4030Page from './Jimide4030Page'

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%23e2e8f0"/%3E%3Ctext x="50%25" y="55%25" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%2394a3b8"%3E📷%3C/text%3E%3C/svg%3E'

const PAUSE_REASONS = [
  { value: 'manque_detail', label: 'Manque de détail' },
  { value: 'rework',        label: 'Rework' },
  { value: 'technical',     label: 'Problème technique' },
  { value: 'lunch',         label: 'Lunch' },
  { value: 'clock_out',     label: 'Clock out' },
]

// ─── Time helpers ─────────────────────────────────────────────────────────────
function getLiveMinutes(sample, now) {
  const base = sample.time_spent_minutes || 0
  if (sample.designer_status === 'ongoing' && sample.time_started) {
    const delta = Math.floor((now - new Date(sample.time_started)) / 60000)
    return base + Math.max(0, delta)
  }
  return base
}
function formatTime(minutes) {
  if (!minutes) return null
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

// ─── Pause justification modal ────────────────────────────────────────────────
function PauseModal({ sample, onConfirm, onCancel }) {
  const [reason, setReason] = useState('')
  return (
    <Dialog.Root open onOpenChange={({ open }) => !open && onCancel()} placement="center" size="sm">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mx="4">
          <Dialog.Header pb="1">
            <Dialog.Title>Justification de la pause</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body spaceY="3">
            <p className="text-sm text-slate-500">
              <span className="font-medium text-slate-700">{sample.apn}</span>
              <span className="mx-1.5 text-slate-300">—</span>
              {sample.project}
            </p>
            <NativeSelect.Root>
              <NativeSelect.Field value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">Sélectionner une raison…</option>
                {PAUSE_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" onClick={onCancel}>Annuler</Button>
            <Button colorPalette="blue" disabled={!reason} onClick={() => onConfirm(reason)}>⏸ Mettre en pause</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

// ─── Full-page upload + BOM editor ────────────────────────────────────────────
const MB = 1_048_576

const BOM_UNITS = [
  { value: 'pcs', label: 'Pièces' },
  { value: 'm',   label: 'Mètre' },
  { value: 'm2',  label: 'Mètre²' },
  { value: 'kg',  label: 'Kilogramme' },
  { value: 'g',   label: 'Gramme' },
  { value: 'l',   label: 'Litre' },
  { value: 'mm',  label: 'Millimètre' },
]

function UploadPage({ sample: initialSample, onSuccess, onBack }) {
  const [sample, setSample]     = useState(initialSample)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [error, setError]         = useState(null)

  const [cadFile, setCadFile]   = useState(null)
  const [pdfFile, setPdfFile]   = useState(null)
  const [bomFile, setBomFile]   = useState(null)

  const [items, setItems]           = useState([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [newItem, setNewItem]       = useState({ reference: '', designation: '', quantity: '1', unit: 'pcs' })
  const [editId, setEditId]         = useState(null)
  const [editData, setEditData]     = useState({})
  const [savingItem, setSavingItem] = useState(false)

  function applyUpdate(updated) {
    setSample((p) => ({ ...p, ...updated }))
    onSuccess(updated)
  }

  useEffect(() => {
    setLoadingItems(true)
    getBomItems(initialSample.id)
      .then((d) => setItems(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {})
      .finally(() => setLoadingItems(false))
  }, [initialSample.id])

  async function doUpload(apiCall) {
    setUploading(true); setProgress(0); setError(null)
    try {
      const updated = await apiCall((pct) => setProgress(pct))
      applyUpdate(updated)
    } catch (err) {
      setError(err?.response?.data?.error ?? "Erreur lors de l'upload.")
    } finally { setUploading(false); setProgress(0) }
  }

  async function handleUploadCad(e) {
    e.preventDefault()
    if (!cadFile) return
    await doUpload((onProg) => {
      const f = new FormData(); f.append('design_file', cadFile)
      return uploadDesign(sample.id, f, onProg).then((r) => { setCadFile(null); return r })
    })
  }

  async function handleUploadPdf(e) {
    e.preventDefault()
    if (!pdfFile) return
    await doUpload((onProg) => {
      const f = new FormData(); f.append('design_pdf', pdfFile)
      return uploadDesign(sample.id, f, onProg).then((r) => { setPdfFile(null); return r })
    })
  }

  async function handleUploadBomFile(e) {
    e.preventDefault()
    if (!bomFile) return
    await doUpload((onProg) => {
      const f = new FormData(); f.append('bom_file', bomFile)
      return uploadBomFile(sample.id, f, onProg).then((r) => {
        setBomFile(null)
        if (r.bom_imported_count !== undefined) {
          setItems([])
          getBomItems(sample.id)
            .then((d) => setItems(Array.isArray(d) ? d : (d.results ?? [])))
            .catch(() => {})
        }
        return r
      })
    })
  }

  async function handleDelete(apiFn) {
    try { applyUpdate(await apiFn()) }
    catch (err) { setError(err?.response?.data?.error ?? 'Erreur.') }
  }

  async function handleAddItem(e) {
    e.preventDefault()
    if (!newItem.reference.trim()) return
    setSavingItem(true)
    try {
      const item = await createBomItem({
        sample: sample.id,
        reference: newItem.reference.trim(),
        designation: newItem.designation.trim(),
        quantity: parseFloat(newItem.quantity) || 1,
        unit: newItem.unit,
      })
      setItems((p) => [...p, item])
      setNewItem({ reference: '', designation: '', quantity: '1', unit: 'pcs' })
    } catch (err) {
      setError(err?.response?.data?.error ?? "Erreur lors de l'ajout.")
    } finally { setSavingItem(false) }
  }

  async function handleSaveEdit(id) {
    setSavingItem(true)
    try {
      const updated = await updateBomItem(id, {
        reference:   editData.reference,
        designation: editData.designation,
        quantity:    parseFloat(editData.quantity) || 1,
        unit:        editData.unit,
      })
      setItems((p) => p.map((it) => it.id === id ? { ...it, ...updated } : it))
      setEditId(null)
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Erreur lors de la modification.')
    } finally { setSavingItem(false) }
  }

  async function handleDeleteItem(id) {
    if (!window.confirm('Supprimer cette ligne BOM ?')) return
    try { await deleteBomItem(id); setItems((p) => p.filter((it) => it.id !== id)) }
    catch (err) { setError(err?.response?.data?.error ?? 'Erreur.') }
  }

  return (
    <main className="max-w-screen-xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-secondary text-sm">← Retour</button>
        <div>
          <h1 className="font-bold text-slate-800 text-xl leading-tight">{sample.apn}</h1>
          <p className="text-sm text-slate-500">{sample.project}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-3">✕</button>
        </div>
      )}

      {/* ── Three upload cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* CAD */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🔷</span>
            <h2 className="font-semibold text-slate-700">Fichier 3D — CAD</h2>
          </div>
          {sample.designFileName ? (
            <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 mb-3 text-xs">
              <a href={sample.designFileUrl} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex-1 truncate font-medium">{sample.designFileName}</a>
              <button onClick={() => { if (window.confirm('Supprimer le fichier 3D ?')) handleDelete(() => deleteDesignFile(sample.id)) }}
                disabled={uploading} className="text-red-400 hover:text-red-600 font-bold shrink-0">✕</button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mb-3">Aucun fichier 3D</p>
          )}
          <form onSubmit={handleUploadCad} className="space-y-2">
            <input type="file"
              accept=".sldprt,.sldasm,.slddrw,.step,.stp,.iges,.igs,.dxf,.toppkg,.top,.ens"
              onChange={(e) => setCadFile(e.target.files[0] || null)}
              disabled={uploading}
              className="input text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
            <p className="text-xs text-slate-400">SolidWorks / TopSolid / .step .igs .dxf</p>
            <button type="submit" disabled={!cadFile || uploading}
              className="btn-primary text-xs w-full disabled:opacity-40">
              {uploading && cadFile ? `Envoi… ${progress}%` : '⬆ Envoyer 3D'}
            </button>
          </form>
        </div>

        {/* Plan PDF */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📄</span>
            <h2 className="font-semibold text-slate-700">Plan PDF</h2>
          </div>
          {sample.designPdfName ? (
            <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2 mb-3 text-xs">
              <a href={sample.designPdfUrl} target="_blank" rel="noopener noreferrer"
                className="text-red-600 hover:underline flex-1 truncate font-medium">{sample.designPdfName}</a>
              <button onClick={() => { if (window.confirm('Supprimer le plan PDF ?')) handleDelete(() => deleteDesignPdf(sample.id)) }}
                disabled={uploading} className="text-red-400 hover:text-red-600 font-bold shrink-0">✕</button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mb-3">Aucun plan PDF</p>
          )}
          <form onSubmit={handleUploadPdf} className="space-y-2">
            <input type="file" accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files[0] || null)}
              disabled={uploading}
              className="input text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer" />
            <button type="submit" disabled={!pdfFile || uploading}
              className="btn-primary text-xs w-full disabled:opacity-40">
              {uploading && pdfFile ? `Envoi… ${progress}%` : '⬆ Envoyer Plan PDF'}
            </button>
          </form>
        </div>

        {/* BOM Excel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📊</span>
            <h2 className="font-semibold text-slate-700">BOM Excel</h2>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            L'upload importe automatiquement les lignes BOM depuis l'Excel.
            Colonnes attendues : <span className="font-mono">Reference, Designation, Quantity, Unit</span>
          </p>
          {sample.bomFileName ? (
            <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2 mb-3 text-xs">
              <a href={sample.bomFileUrl} target="_blank" rel="noopener noreferrer"
                className="text-green-700 hover:underline flex-1 truncate font-medium">{sample.bomFileName}</a>
              <button onClick={() => { if (window.confirm('Supprimer le fichier BOM Excel ?')) handleDelete(() => deleteBomPdf(sample.id)) }}
                disabled={uploading} className="text-red-400 hover:text-red-600 font-bold shrink-0">✕</button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mb-3">Aucun fichier BOM</p>
          )}
          <form onSubmit={handleUploadBomFile} className="space-y-2">
            <input type="file" accept=".xlsx,.xls"
              onChange={(e) => setBomFile(e.target.files[0] || null)}
              disabled={uploading}
              className="input text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer" />
            <button type="submit" disabled={!bomFile || uploading}
              className="btn-primary text-xs w-full disabled:opacity-40">
              {uploading && bomFile ? `Envoi… ${progress}%` : '⬆ Envoyer BOM Excel'}
            </button>
          </form>
        </div>
      </div>

      {/* ── BOM items table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Nomenclature — Lignes BOM</h2>
          <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{items.length} ligne{items.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Add row */}
        <form onSubmit={handleAddItem} className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[120px]">
              <label className="label text-xs">Référence *</label>
              <input type="text" value={newItem.reference} placeholder="REF-001"
                onChange={(e) => setNewItem((p) => ({ ...p, reference: e.target.value }))}
                className="input text-sm" required />
            </div>
            <div className="flex-[2] min-w-[160px]">
              <label className="label text-xs">Désignation</label>
              <input type="text" value={newItem.designation} placeholder="Vis M3×10"
                onChange={(e) => setNewItem((p) => ({ ...p, designation: e.target.value }))}
                className="input text-sm" />
            </div>
            <div className="w-24">
              <label className="label text-xs">Quantité</label>
              <input type="number" value={newItem.quantity} min="0.001" step="any"
                onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                className="input text-sm" />
            </div>
            <div className="w-32">
              <label className="label text-xs">Unité</label>
              <select value={newItem.unit} onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))} className="input text-sm">
                {BOM_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <button type="submit" disabled={savingItem || !newItem.reference.trim()} className="btn-primary text-sm shrink-0 disabled:opacity-40">
              {savingItem ? '…' : '+ Ajouter'}
            </button>
          </div>
        </form>

        {loadingItems ? (
          <div className="text-center py-8 text-slate-400 text-sm">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">Aucune ligne. Ajoutez des composants ci-dessus.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 w-36">Référence</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Désignation</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 w-24">Quantité</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 w-28">Unité</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    {editId === item.id ? (
                      <>
                        <td className="px-4 py-2"><input type="text" value={editData.reference} onChange={(e) => setEditData((p) => ({ ...p, reference: e.target.value }))} className="input text-xs" /></td>
                        <td className="px-4 py-2"><input type="text" value={editData.designation} onChange={(e) => setEditData((p) => ({ ...p, designation: e.target.value }))} className="input text-xs" /></td>
                        <td className="px-4 py-2"><input type="number" value={editData.quantity} min="0.001" step="any" onChange={(e) => setEditData((p) => ({ ...p, quantity: e.target.value }))} className="input text-xs w-20" /></td>
                        <td className="px-4 py-2">
                          <select value={editData.unit} onChange={(e) => setEditData((p) => ({ ...p, unit: e.target.value }))} className="input text-xs">
                            {BOM_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => handleSaveEdit(item.id)} disabled={savingItem} className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">Sauv.</button>
                            <button onClick={() => setEditId(null)} className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100">Annuler</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2.5 font-mono text-xs font-medium text-slate-700">{item.reference}</td>
                        <td className="px-4 py-2.5 text-slate-600">{item.designation || '—'}</td>
                        <td className="px-4 py-2.5 font-medium">{parseFloat(item.quantity)}</td>
                        <td className="px-4 py-2.5 text-slate-500">{BOM_UNITS.find((u) => u.value === item.unit)?.label ?? item.unit}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1">
                            <button onClick={() => { setEditId(item.id); setEditData({ reference: item.reference, designation: item.designation, quantity: String(item.quantity), unit: item.unit }) }}
                              className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100">✏ Modifier</button>
                            <button onClick={() => handleDeleteItem(item.id)}
                              className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50">✕</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

// ─── Pending detail modal ─────────────────────────────────────────────────────
function PendingDetailModal({ sample: s, onClose }) {
  if (!s) return null
  return (
    <Dialog.Root open onOpenChange={({ open }) => !open && onClose()} placement="center" size="lg">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mx="4" maxH="90vh" overflow="hidden" display="flex" flexDirection="column">
          <Dialog.Header>
            <div>
              <Dialog.Title>{s.apn}</Dialog.Title>
              {s.serial_number != null && <span className="text-xs text-slate-400 font-mono">#{s.serial_number}</span>}
            </div>
          </Dialog.Header>
          <Dialog.Body overflowY="auto" spaceY="4">
            {s.thumbnailUrl && (
              <img src={s.thumbnailUrl} alt={s.apn}
                className="w-full max-h-64 object-contain rounded-lg bg-slate-100"
                onError={(e) => { e.target.style.display = 'none' }} />
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Projet</dt>       <dd className="text-slate-800 font-medium">{s.project || '—'}</dd>
              <dt className="text-slate-500">Placement</dt>    <dd><span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{s.placement}</span></dd>
              <dt className="text-slate-500">Quantité</dt>     <dd className="font-medium">{s.quantity}</dd>
              <dt className="text-slate-500">Client</dt>       <dd>{s.clientDisplay || s.client || '—'}</dd>
              <dt className="text-slate-500">Réception</dt>    <dd>{s.received_date ? new Date(s.received_date + 'T00:00:00').toLocaleDateString('fr-FR') : '—'}</dd>
              {s.description && <>
                <dt className="text-slate-500 col-span-2">Description</dt>
                <dd className="col-span-2 text-slate-700 bg-slate-50 rounded p-2 text-xs">{s.description}</dd>
              </>}
            </dl>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" onClick={onClose}>Fermer</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

// ─── Designer Page ─────────────────────────────────────────────────────────
export default function DesignerPage({ currentUser }) {
  const [activeTab, setActiveTab]   = useState('encours')
  const [samples, setSamples]       = useState([])
  const [pendingSamples, setPendingSamples] = useState([])
  const [loading, setLoading]       = useState(false)
  const [loadingPending, setLoadingPending] = useState(false)
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null, page: 1 })
  const [now, setNow]               = useState(() => Date.now())

  const [search, setSearch]               = useState('')
  const [debouncedSearch, setDebounced]   = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterDone, setFilterDone]       = useState('')
  const [filterDateFrom, setDateFrom]     = useState('')
  const [filterDateTo, setDateTo]         = useState('')
  const [projectOptions, setProjectOptions] = useState([])

  const [pauseTarget, setPauseTarget]   = useState(null)
  const [uploadTarget, setUploadTarget] = useState(null)
  const [pendingDetail, setPendingDetail] = useState(null)
  const [busy, setBusy]                 = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => { getProjects().then(setProjectOptions).catch(() => {}) }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const fetchSamples = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, status: 'approved' }
      if (debouncedSearch)   params.search    = debouncedSearch
      if (filterProject)     params.project   = filterProject
      if (filterDone !== '') params.is_done   = filterDone
      if (filterDateFrom)    params.date_from = filterDateFrom
      if (filterDateTo)      params.date_to   = filterDateTo
      const data = await getSamples(params)
      setSamples(data.results)
      setPagination({ count: data.count, next: data.next, previous: data.previous, page })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, filterProject, filterDone, filterDateFrom, filterDateTo])

  const fetchPendingSamples = useCallback(async () => {
    setLoadingPending(true)
    try {
      const params = { status: 'pending', page_size: 100 }
      if (debouncedSearch) params.search  = debouncedSearch
      if (filterProject)   params.project = filterProject
      if (filterDateFrom)  params.date_from = filterDateFrom
      if (filterDateTo)    params.date_to   = filterDateTo
      const data = await getSamples(params)
      setPendingSamples(data.results)
    } finally {
      setLoadingPending(false)
    }
  }, [debouncedSearch, filterProject, filterDateFrom, filterDateTo])

  useEffect(() => { fetchSamples(1) }, [fetchSamples])
  useEffect(() => { fetchPendingSamples() }, [fetchPendingSamples])

  // ── Actions ──────────────────────────────────────────────────────────────
  async function handleStatusChange(sample, newStatus, pauseReason = null) {
    setBusy(sample.id)
    try {
      const updated = await setDesignerStatus(sample.id, newStatus, pauseReason)
      setSamples((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))
    } finally {
      setBusy(null)
    }
  }

  function handlePauseClick(sample) { setPauseTarget(sample) }

  async function handlePauseConfirm(reason) {
    const sample = pauseTarget
    setPauseTarget(null)
    await handleStatusChange(sample, 'standby', reason)
  }

  async function handleUndo(sample) {
    setBusy(sample.id)
    try {
      const updated = await markDone(sample.id, false)
      setSamples((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))
    } finally {
      setBusy(null)
    }
  }

  function handleUploadSuccess(updated) {
    setSamples((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))
  }

  const hasFilters = search || filterProject || filterDone !== '' || filterDateFrom || filterDateTo
  const totalPages = Math.ceil(pagination.count / 20)

  const notStartedCount = samples.filter((s) => !s.is_done && !s.designer_status).length
  const ongoingCount    = samples.filter((s) => !s.is_done && s.designer_status === 'ongoing').length
  const standbyCount    = samples.filter((s) => !s.is_done && s.designer_status === 'standby').length
  const doneCount       = samples.filter((s) => s.is_done).length

  if (uploadTarget) {
    return (
      <UploadPage
        sample={uploadTarget}
        onSuccess={handleUploadSuccess}
        onBack={() => setUploadTarget(null)}
      />
    )
  }

  return (
    <main className="max-w-screen-xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-slate-200 p-1 w-fit">
        <button
          onClick={() => setActiveTab('encours')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'encours' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >En cours ({samples.length})</button>
        <button
          onClick={() => setActiveTab('attente')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'attente' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >En attente ({pendingSamples.length})</button>
        <button
          onClick={() => setActiveTab('jimide')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'jimide' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >JIMIDE-4030</button>
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher APN, projet, placement…"
              className="input"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
              {[
                { value: '',      label: 'Tous' },
                { value: 'false', label: 'À faire' },
                { value: 'true',  label: 'Terminés' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterDone(opt.value)}
                  className={`px-3 py-2 transition-colors ${
                    filterDone === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="input w-auto max-w-xs">
              <option value="">Tous les projets</option>
              {projectOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" value={filterDateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input w-auto" />
            <input type="date" value={filterDateTo}   onChange={(e) => setDateTo(e.target.value)}   className="input w-auto" />
            {hasFilters && (
              <button onClick={() => { setSearch(''); setFilterProject(''); setFilterDone(''); setDateFrom(''); setDateTo('') }} className="btn-secondary text-xs">
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'encours' && (
        <>
          {/* ── Counters ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <StatCard label="Non commencé" value={notStartedCount} color="slate"  note="sur cette page" />
            <StatCard label="En cours"     value={ongoingCount}    color="blue"   note="sur cette page" pulse />
            <StatCard label="En pause"     value={standbyCount}    color="orange" note="sur cette page" />
            <StatCard label="Terminés"     value={doneCount}       color="green"  note="sur cette page" />
          </div>

          {/* ── Content ── */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm text-slate-500">
                {pagination.count} échantillon{pagination.count !== 1 ? 's' : ''} approuvés
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
                <Spinner color="blue.600" />
                <p className="text-sm">Chargement…</p>
              </div>
            ) : samples.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-lg mb-1">Aucun échantillon approuvé</p>
                <p className="text-sm">Modifiez vos filtres.</p>
              </div>
            ) : (
              <>
                {/* ── Mobile cards (< sm) ── */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {samples.map((s) => (
                    <DesignerCard
                      key={s.id}
                      sample={s}
                      now={now}
                      busy={busy === s.id}
                      currentUserId={currentUser?.id}
                      onStatusChange={(st) => handleStatusChange(s, st)}
                      onPause={() => handlePauseClick(s)}
                      onUndo={() => handleUndo(s)}
                      onUpload={() => setUploadTarget(s)}
                    />
                  ))}
                </div>

                {/* ── Desktop table (≥ sm) ── */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-14">Photo</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">APN</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Projet</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-24">Placement</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-16">Qté</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">Par</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-36">Pause raison</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-24">Temps</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">Date de fin</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-24">Fichiers</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-52">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {samples.map((s) => (
                        <DesignerRow
                          key={s.id}
                          sample={s}
                          now={now}
                          busy={busy === s.id}
                          currentUserId={currentUser?.id}
                          onStatusChange={(st) => handleStatusChange(s, st)}
                          onPause={() => handlePauseClick(s)}
                          onUndo={() => handleUndo(s)}
                          onUpload={() => setUploadTarget(s)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-sm text-slate-500">Page {pagination.page} / {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => fetchSamples(pagination.page - 1)} disabled={!pagination.previous} className="btn-secondary disabled:opacity-40">â† Préc.</button>
                  <button onClick={() => fetchSamples(pagination.page + 1)} disabled={!pagination.next}     className="btn-secondary disabled:opacity-40">Suiv. →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'attente' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm text-slate-500">{pendingSamples.length} échantillon{pendingSamples.length !== 1 ? 's' : ''} en attente d'approbation</p>
          </div>
          {loadingPending ? (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
              <Spinner color="gray.400" />
              <p className="text-sm">Chargement…</p>
            </div>
          ) : pendingSamples.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-lg mb-1">Aucun échantillon en attente</p>
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-slate-100">
                {pendingSamples.map((s) => (
                  <div key={s.id} className="p-4 hover:bg-slate-50 cursor-pointer" onClick={() => setPendingDetail(s)}>
                    <div className="flex gap-3">
                      <img src={s.thumbnailUrl || PLACEHOLDER} alt={s.apn}
                        className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0"
                        onError={(e) => { e.target.src = PLACEHOLDER }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{s.apn}</p>
                        <p className="text-xs text-slate-500">{s.project}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{s.placement}</span>
                          <span className="text-xs text-slate-500">×{s.quantity}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-4 py-3 font-medium text-slate-600 w-14">Photo</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">APN</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Projet</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 w-24">Placement</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 w-16">Qté</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Description</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">Date réception</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingSamples.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setPendingDetail(s)}>
                        <td className="px-4 py-3">
                          <img src={s.thumbnailUrl || PLACEHOLDER} alt={s.apn}
                            className="w-10 h-10 rounded object-cover bg-slate-100"
                            onError={(e) => { e.target.src = PLACEHOLDER }} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{s.apn}</div>
                          {s.serial_number != null && <div className="text-xs text-slate-400 font-mono">#{s.serial_number}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs"><span className="line-clamp-2">{s.project}</span></td>
                        <td className="px-4 py-3"><span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{s.placement}</span></td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-700">{s.quantity}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-xs"><span className="line-clamp-2">{s.description || '—'}</span></td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{s.received_date ? new Date(s.received_date + 'T00:00:00').toLocaleDateString('fr-FR') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'jimide' && <Jimide4030Page />}

      {pauseTarget && (
        <PauseModal
          sample={pauseTarget}
          onConfirm={handlePauseConfirm}
          onCancel={() => setPauseTarget(null)}
        />
      )}
      {pendingDetail && (
        <PendingDetailModal
          sample={pendingDetail}
          onClose={() => setPendingDetail(null)}
        />
      )}
    </main>
  )
}

// ─── Mobile card ──────────────────────────────────────────────────────────────
function DesignerCard({ sample: s, now, busy, currentUserId, onStatusChange, onPause, onUndo, onUpload }) {
  const liveMinutes = getLiveMinutes(s, now)
  const timeLabel   = formatTime(liveMinutes)
  const ds = s.designer_status
  const lockedByOther = s.designerLockedById && s.designerLockedById !== currentUserId
                        && (ds === 'ongoing' || ds === 'standby')
  const workerName = s.is_done
    ? s.doneBy
    : (ds === 'ongoing' || ds === 'standby') ? s.designerLockedBy : null

  return (
    <div className={`p-4 ${
      s.is_rework      ? 'bg-red-50/40 border-l-4 border-red-400'    :
      s.is_done        ? 'bg-green-50/40'  :
      ds === 'ongoing' ? 'bg-blue-50/30'   :
      ds === 'standby' ? 'bg-orange-50/30' :
      'bg-white'
    }`}>
      {/* Header */}
      <div className="flex gap-3">
        <img src={s.thumbnailUrl || PLACEHOLDER} alt={s.apn}
          className="w-14 h-14 rounded-lg object-cover bg-slate-100 shrink-0"
          onError={(e) => { e.target.src = PLACEHOLDER }} />
        <div className="flex-1 min-w-0">
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{s.apn}</p>
            {s.serial_number != null && <span className="text-xs text-slate-400 font-mono">#{s.serial_number}</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{s.project}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{s.placement}</span>
            <span className="text-xs text-slate-500">×{s.quantity}</span>
            {s.is_rework && <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold">↺ REWORK</span>}
          </div>
        </div>
      </div>

      {/* Meta: time + worker + pause reason */}
      {(timeLabel || workerName || (ds === 'standby' && s.pauseReasonDisplay) || s.done_date) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
          {timeLabel && (
            <span className={`font-mono ${ds === 'ongoing' && !s.is_done ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
              ⏱ {timeLabel}
            </span>
          )}
          {workerName && (
            <span className={`font-medium ${s.is_done ? 'text-green-700' : ds === 'ongoing' ? 'text-blue-700' : 'text-orange-700'}`}>
              👤 {workerName}
            </span>
          )}
          {ds === 'standby' && s.pauseReasonDisplay && (
            <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">⏸ {s.pauseReasonDisplay}</span>
          )}
          {s.done_date && (
            <span className="text-slate-400">{new Date(s.done_date + 'T00:00:00').toLocaleDateString('fr-FR')}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3">
        {busy ? (
          <div className="flex justify-center py-2">
            <Spinner color="blue.500" size="sm" />
          </div>
        ) : lockedByOther ? (
          <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2.5 text-center">
            🔒 En cours par {s.designerLockedBy}
          </div>
        ) : s.is_done ? (
          <button onClick={onUndo} className="w-full py-2.5 text-sm border border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-500 rounded-lg transition-colors font-medium">
            ✕ Annuler
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => onStatusChange('ongoing')}
              disabled={ds === 'ongoing'}
              className={`flex-1 py-2.5 text-sm rounded-lg border font-medium transition-colors ${
                ds === 'ongoing' ? 'bg-blue-100 text-blue-700 border-blue-200 cursor-default'
                                 : 'bg-white text-blue-600 border-blue-300 active:bg-blue-50'}`}
            >▶ Démarrer</button>
            <button
              onClick={onPause}
              disabled={ds !== 'ongoing'}
              className={`px-4 py-2.5 text-sm rounded-lg border font-medium transition-colors ${
                ds === 'standby'   ? 'bg-orange-100 text-orange-700 border-orange-200 cursor-default'
                : ds === 'ongoing' ? 'bg-white text-orange-600 border-orange-300 active:bg-orange-50'
                                   : 'bg-white text-slate-300 border-slate-200 cursor-not-allowed'}`}
            >⏸</button>
            <button
              onClick={() => onStatusChange('done')}
              className="flex-1 py-2.5 text-sm rounded-lg border bg-white text-green-600 border-green-300 active:bg-green-50 font-medium transition-colors"
            >✓ Terminé</button>
          </div>
        )}
      </div>

      {/* Upload design files */}
      <div className="mt-2 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {s.designFileName
              ? <span className="text-green-600 font-medium">🔷 {s.designFileName}</span>
              : <span className="text-slate-400">Pas de fichier 3D</span>}
            {s.designPdfName && <span className="text-red-600 font-medium">📄 PDF</span>}
          </div>
          <button
            onClick={onUpload}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-600 bg-blue-50 active:bg-blue-100 font-medium"
          >
            📎 Fichiers
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Desktop table row ────────────────────────────────────────────────────────
function DesignerRow({ sample: s, now, busy, currentUserId, onStatusChange, onPause, onUndo, onUpload }) {
  const liveMinutes = getLiveMinutes(s, now)
  const timeLabel   = formatTime(liveMinutes)
  const ds = s.designer_status

  const lockedByOther = s.designerLockedById && s.designerLockedById !== currentUserId
                        && (ds === 'ongoing' || ds === 'standby')

  const workerName = s.is_done
    ? s.doneBy
    : (ds === 'ongoing' || ds === 'standby') ? s.designerLockedBy : null

  return (
    <tr className={`transition-colors ${
      s.is_rework      ? 'bg-red-50/40'    :
      s.is_done        ? 'bg-green-50/40'  :
      ds === 'ongoing' ? 'bg-blue-50/30'   :
      ds === 'standby' ? 'bg-orange-50/30' :
      'hover:bg-slate-50'
    }`}>
      <td className="px-4 py-3">
        <img src={s.thumbnailUrl || PLACEHOLDER} alt={s.apn}
          className="w-10 h-10 rounded object-cover bg-slate-100"
          onError={(e) => { e.target.src = PLACEHOLDER }} />
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-slate-800">{s.apn}</div>
        {s.serial_number != null && (
          <div className="text-xs text-slate-400 font-mono">#{s.serial_number}</div>
        )}
        {s.is_rework && (
          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-semibold">↺ REWORK</span>
        )}
      </td>
      <td className="px-4 py-3 text-slate-600 max-w-xs">
        <span className="line-clamp-2 leading-snug">{s.project}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{s.placement}</span>
      </td>
      <td className="px-4 py-3 text-xs font-medium text-slate-700">{s.quantity}</td>
      <td className="px-4 py-3 text-xs text-slate-600">
        {workerName ? (
          <span className={`font-medium ${s.is_done ? 'text-green-700' : ds === 'ongoing' ? 'text-blue-700' : 'text-orange-700'}`}>
            {workerName}
          </span>
        ) : '—'}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {ds === 'standby' && s.pauseReasonDisplay ? (
          <span className="inline-block px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
            {s.pauseReasonDisplay}
          </span>
        ) : '—'}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-slate-600">
        {timeLabel ? <span className={ds === 'ongoing' && !s.is_done ? 'text-blue-600 font-semibold' : ''}>{timeLabel}</span> : '—'}
      </td>
      <td className="px-4 py-3 text-slate-500 text-sm">
        {s.done_date ? new Date(s.done_date + 'T00:00:00').toLocaleDateString('fr-FR') : '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          {s.designFileName
            ? <span className="text-xs text-green-600 font-medium truncate max-w-[60px]" title={s.designFileName}>🔷 3D</span>
            : <span className="text-xs text-slate-300">—</span>}
          {s.designPdfName && <span className="text-xs text-red-500 font-medium">📄 PDF</span>}
          <button
            onClick={onUpload}
            className="text-xs px-1.5 py-0.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors font-medium mt-0.5"
          >📎 Upload</button>
        </div>
      </td>
      <td className="px-4 py-3">
        {busy ? (
          <Spinner color="blue.500" size="xs" />
        ) : lockedByOther ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            🔒 {s.designerLockedBy}
          </span>
        ) : s.is_done ? (
          <button onClick={onUndo} className="text-xs text-slate-400 hover:text-red-500 transition-colors border border-slate-200 hover:border-red-300 rounded px-2 py-1">
            ✕ Annuler
          </button>
        ) : (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => onStatusChange('ongoing')}
              disabled={ds === 'ongoing'}
              className={`text-xs rounded px-2 py-1 border transition-colors ${
                ds === 'ongoing' ? 'bg-blue-100 text-blue-700 border-blue-200 cursor-default'
                                 : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'}`}
            >▶ En cours</button>
            <button
              onClick={onPause}
              disabled={ds !== 'ongoing'}
              className={`text-xs rounded px-2 py-1 border transition-colors ${
                ds === 'standby'   ? 'bg-orange-100 text-orange-700 border-orange-200 cursor-default'
                : ds === 'ongoing' ? 'bg-white text-orange-600 border-orange-300 hover:bg-orange-50'
                                   : 'bg-white text-slate-300 border-slate-200 cursor-not-allowed'}`}
            >⏸ Pause</button>
            <button
              onClick={() => onStatusChange('done')}
              className="text-xs rounded px-2 py-1 border bg-white text-green-600 border-green-300 hover:bg-green-50 transition-colors"
            >✓ Terminé</button>
          </div>
        )}
      </td>
    </tr>
  )
}

function DesignerStatusBadge({ status, isDone }) {
  if (isDone) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">✓ Terminé</span>
  )
  if (status === 'ongoing') return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
      </span>
      En cours
    </span>
  )
  if (status === 'standby') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">⏸ En pause</span>
  )
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">À faire</span>
  )
}

const CARD_COLORS = {
  slate:  'border-slate-200 bg-slate-50 text-slate-600',
  blue:   'border-blue-200 bg-blue-50 text-blue-700',
  green:  'border-green-200 bg-green-50 text-green-700',
  orange: 'border-orange-200 bg-orange-50 text-orange-700',
}
function StatCard({ label, value, color, note, pulse }) {
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${CARD_COLORS[color]}`}>
      <div className="flex items-center gap-2">
        <p className="text-xs sm:text-sm font-medium opacity-80">{label}</p>
        {pulse && value > 0 && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
      {note && <p className="text-xs opacity-60 mt-0.5">{note}</p>}
    </div>
  )
}
