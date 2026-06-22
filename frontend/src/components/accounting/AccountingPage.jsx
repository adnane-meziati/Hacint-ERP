import { useCallback, useEffect, useState } from 'react'
import {
  getAccountingStats, getDocuments, deleteDocument, validerDocument,
  setDocumentStatut, convertirEnFacture, creerAvoir, documentPdfUrl,
  getPaiements, createPaiement, deletePaiement, paiementPdfUrl, printPdf,
  getTiers, createTiers, updateTiers, deleteTiers,
  getTaxCodes, createTaxCode, updateTaxCode,
  getSociete, updateSociete,
  getTvaRapport, tvaReleveDeductionsUrl, tvaExportXlsxUrl,
} from '../../api/client'
import DocumentModal from './DocumentModal'
import ProcurementAccountingTab from '../procurement/ProcurementAccountingTab'
import AssetLifespanTab from './AssetLifespanTab'
import {
  BalanceEtatsTab, EcrituresTab, GrandLivreTab, PcgeTab,
} from './ComptaGeneraleTabs'
import {
  getExercices, cloturerExercice, rouvrirExercice,
} from '../../api/client'

// ─── Shared helpers ───────────────────────────────────────────────────────────

export function fmtMoney(n) {
  if (n == null || n === '') return '—'
  return parseFloat(n).toLocaleString('fr-FR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })
}

export const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400'

export function Badge({ color, children }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${color}`}>{children}</span>
}

const STATUT_COLORS = {
  brouillon:           'bg-gray-100 text-gray-600',
  validee:             'bg-blue-100 text-blue-700',
  envoye:              'bg-blue-100 text-blue-700',
  accepte:             'bg-green-100 text-green-700',
  refuse:              'bg-red-100 text-red-700',
  expire:              'bg-gray-100 text-gray-500',
  partiellement_payee: 'bg-yellow-100 text-yellow-700',
  payee:               'bg-green-100 text-green-700',
  annulee:             'bg-red-100 text-red-700',
}

function StatutBadge({ doc }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Badge color={STATUT_COLORS[doc.statut] || 'bg-gray-100 text-gray-600'}>{doc.statutDisplay}</Badge>
      {doc.estEnRetard && <Badge color="bg-red-100 text-red-700">En retard</Badge>}
    </span>
  )
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} mx-4 flex flex-col max-h-[92vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children, required, className = 'mb-4' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

export function Input(props) { return <input className={inputCls} {...props} /> }
export function Select({ children, ...props }) { return <select className={inputCls} {...props}>{children}</select> }
export function Textarea(props) { return <textarea className={`${inputCls} resize-none`} rows={3} {...props} /> }

export function FormActions({ onClose, saving, label = 'Enregistrer' }) {
  return (
    <div className="flex justify-end gap-3 mt-2">
      <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Annuler</button>
      <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
        {saving ? 'Enregistrement...' : label}
      </button>
    </div>
  )
}

export function Pagination({ page, count, pageSize, onPage }) {
  const total = Math.ceil((count || 0) / pageSize)
  if (total <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
      <span>{count} résultats</span>
      <div className="flex gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">Préc.</button>
        <span className="px-3 py-1">{page} / {total}</span>
        <button onClick={() => onPage(page + 1)} disabled={page >= total} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">Suiv.</button>
      </div>
    </div>
  )
}

export function ErrMsg({ error }) {
  if (!error) return null
  return <div className="text-red-600 text-sm mb-3 p-3 bg-red-50 rounded-lg">{error}</div>
}

export function extractError(e) {
  const data = e.response?.data
  if (!data) return 'Erreur de connexion au serveur.'
  if (typeof data === 'string') return data
  if (data.error) return data.error
  if (data.detail) return data.detail
  const parts = []
  for (const [key, val] of Object.entries(data)) {
    const msg = Array.isArray(val) ? val.join(' ') : (typeof val === 'object' ? JSON.stringify(val) : String(val))
    parts.push(key === 'non_field_errors' ? msg : `${key}: ${msg}`)
  }
  return parts.length ? parts.join(' ') : 'Erreur'
}

export function Loading() { return <div className="text-center py-10 text-gray-400">Chargement...</div> }
export function Empty({ cols, msg = 'Aucun résultat' }) { return <tr><td colSpan={cols} className="text-center py-8 text-gray-400">{msg}</td></tr> }

export function Table({ headers, children }) {
  return (
    <div className="bg-white rounded-xl border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">{headers}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function AddBtn({ onClick, label }) {
  return (
    <button onClick={onClick} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 whitespace-nowrap">
      {label}
    </button>
  )
}

const MODES_PAIEMENT = [
  { value: 'virement',     label: 'Virement bancaire' },
  { value: 'cheque',       label: 'Chèque' },
  { value: 'espece',       label: 'Espèces (timbre 0,25 %)' },
  { value: 'effet',        label: 'Effet de commerce' },
  { value: 'carte',        label: 'Carte bancaire' },
  { value: 'compensation', label: 'Compensation' },
]

// ─── Paiement modal ───────────────────────────────────────────────────────────

function PaiementModal({ document: doc, onClose, onSaved }) {
  const [form, setForm] = useState({
    montant: doc.resteAPayer ?? '',
    date_paiement: new Date().toISOString().slice(0, 10),
    mode: 'virement', reference: '', banque: '', notes: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await createPaiement({ document: doc.id, ...form })
      onSaved()
    } catch (err) { setError(extractError(err)) } finally { setSaving(false) }
  }

  return (
    <Modal title={`Paiement — ${doc.numero}`} onClose={onClose}>
      <ErrMsg error={error} />
      <p className="text-sm text-gray-500 mb-4">
        {doc.tiersNom} — Net à payer : <b>{fmtMoney(doc.net_a_payer)} MAD</b> —
        Reste : <b>{fmtMoney(doc.resteAPayer)} MAD</b>
      </p>
      <form onSubmit={submit}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Montant (MAD)" required>
            <Input type="number" step="0.01" min="0.01" value={form.montant}
              onChange={e => set('montant', e.target.value)} required />
          </Field>
          <Field label="Date" required>
            <Input type="date" value={form.date_paiement}
              onChange={e => set('date_paiement', e.target.value)} required />
          </Field>
        </div>
        <Field label="Mode de paiement">
          <Select value={form.mode} onChange={e => set('mode', e.target.value)}>
            {MODES_PAIEMENT.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Référence (n° chèque…)">
            <Input value={form.reference} onChange={e => set('reference', e.target.value)} />
          </Field>
          <Field label="Banque">
            <Input value={form.banque} onChange={e => set('banque', e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} />
        </Field>
        <FormActions onClose={onClose} saving={saving} label="Encaisser" />
      </form>
    </Modal>
  )
}

// ─── Tableau de bord ──────────────────────────────────────────────────────────

function StatCard({ label, value, accent, suffix = 'MAD' }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent || 'text-gray-800'}`}>
        {typeof value === 'number' ? fmtMoney(value) : value} <span className="text-xs font-normal text-gray-400">{suffix}</span>
      </p>
    </div>
  )
}

function DashboardTab() {
  const [stats, setStats] = useState(null)
  const [retards, setRetards] = useState([])
  const annee = new Date().getFullYear()

  useEffect(() => {
    getAccountingStats(annee).then(setStats).catch(() => {})
    getDocuments({ en_retard: 1, page_size: 10 })
      .then(d => setRetards(d.results || []))
      .catch(() => {})
  }, [annee])

  if (!stats) return <Loading />
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label={`CA ${annee} (HT)`} value={stats.ca_ht} accent="text-emerald-700" />
        <StatCard label={`Achats ${annee} (HT)`} value={stats.achats_ht} />
        <StatCard label="Encours clients" value={stats.encours_clients} accent="text-blue-700" />
        <StatCard label="Encours fournisseurs" value={stats.encours_fournisseurs} />
        <StatCard label="Factures en retard" value={String(stats.nb_en_retard)} suffix="" accent={stats.nb_en_retard > 0 ? 'text-red-600' : 'text-gray-800'} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Factures en retard de paiement</h3>
        <Table headers={
          <tr className="text-left text-gray-500">
            <th className="px-4 py-3">N°</th><th className="px-4 py-3">Tiers</th>
            <th className="px-4 py-3">Échéance</th>
            <th className="px-4 py-3 text-right">Reste à payer</th>
          </tr>
        }>
          {retards.length === 0 && <Empty cols={4} msg="Aucune facture en retard 🎉" />}
          {retards.map(d => (
            <tr key={d.id} className="border-t">
              <td className="px-4 py-3 font-medium">{d.numero}</td>
              <td className="px-4 py-3">{d.tiersNom}</td>
              <td className="px-4 py-3 text-red-600">{d.date_echeance}</td>
              <td className="px-4 py-3 text-right font-medium">{fmtMoney(d.resteAPayer)} MAD</td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  )
}

// ─── Documents (devis / factures / avoirs / achats) ───────────────────────────

const DOC_TAB_CONFIG = {
  devis:    { docType: 'devis',         addLabel: '+ Nouveau devis' },
  factures: { docType: 'facture',       addLabel: '+ Nouvelle facture' },
  avoirs:   { docType: 'avoir,avoir_achat', addLabel: null },
  achats:   { docType: 'facture_achat', addLabel: "+ Nouvelle facture d'achat" },
}

export function DocumentsTab({ tab, currentUser }) {
  const config = DOC_TAB_CONFIG[tab]
  const [docs, setDocs] = useState([])
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState('')
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)          // {mode:'new'|'edit', doc}
  const [paiementDoc, setPaiementDoc] = useState(null)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { doc_type: config.docType, page, page_size: 20 }
      if (search) params.search = search
      if (statut) params.statut = statut
      const data = await getDocuments(params)
      setDocs(data.results || []); setCount(data.count || 0)
    } finally { setLoading(false) }
  }, [config.docType, search, statut, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1); setStatut('') }, [tab])

  async function run(id, fn, confirmMsg) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setBusyId(id); setActionError('')
    try { await fn(); await load() }
    catch (e) { setActionError(extractError(e)) }
    finally { setBusyId(null) }
  }

  const estFactureTab = tab === 'factures' || tab === 'achats'

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input className={`${inputCls} max-w-xs`} placeholder="Rechercher… (n°, tiers, objet, réf.)"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <Select value={statut} onChange={e => { setStatut(e.target.value); setPage(1) }}
          style={{ width: 'auto' }}>
          <option value="">Tous les statuts</option>
          <option value="brouillon">Brouillon</option>
          {tab === 'devis' && <>
            <option value="envoye">Envoyé</option>
            <option value="accepte">Accepté</option>
            <option value="refuse">Refusé</option>
          </>}
          {tab !== 'devis' && <option value="validee">Validé</option>}
          {estFactureTab && <>
            <option value="partiellement_payee">Partiellement payé</option>
            <option value="payee">Payé</option>
          </>}
        </Select>
        <div className="flex-1" />
        {config.addLabel && <AddBtn onClick={() => setModal({ mode: 'new' })} label={config.addLabel} />}
      </div>

      <ErrMsg error={actionError} />
      {loading ? <Loading /> : (
        <Table headers={
          <tr className="text-left text-gray-500">
            <th className="px-4 py-3">N°</th>
            {tab === 'avoirs' && <th className="px-4 py-3">Type</th>}
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Tiers</th>
            <th className="px-4 py-3">{tab === 'achats' ? 'Réf. fournisseur' : 'Objet'}</th>
            <th className="px-4 py-3 text-right">Total HT</th>
            <th className="px-4 py-3 text-right">TTC</th>
            {estFactureTab && <th className="px-4 py-3 text-right">Reste</th>}
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        }>
          {docs.length === 0 && <Empty cols={10} />}
          {docs.map(d => (
            <tr key={d.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-3 font-medium whitespace-nowrap">
                {d.numero || <span className="text-gray-400 italic">brouillon</span>}
              </td>
              {tab === 'avoirs' && <td className="px-4 py-3">{d.typeDisplay}</td>}
              <td className="px-4 py-3 whitespace-nowrap">{d.date_emission}</td>
              <td className="px-4 py-3">{d.tiersNom}</td>
              <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                {tab === 'achats' ? d.reference_externe : d.objet}
              </td>
              <td className="px-4 py-3 text-right">{fmtMoney(d.total_ht)}</td>
              <td className="px-4 py-3 text-right font-medium">{fmtMoney(d.total_ttc)}</td>
              {estFactureTab && (
                <td className="px-4 py-3 text-right">
                  {['validee', 'partiellement_payee', 'payee'].includes(d.statut)
                    ? fmtMoney(d.resteAPayer) : '—'}
                </td>
              )}
              <td className="px-4 py-3"><StatutBadge doc={d} /></td>
              <td className="px-4 py-3 text-right whitespace-nowrap space-x-2 text-sm">
                {d.statut === 'brouillon' && <>
                  <button disabled={busyId === d.id} onClick={() => setModal({ mode: 'edit', doc: d })}
                    className="text-blue-500 hover:underline">Modifier</button>
                  <button disabled={busyId === d.id}
                    onClick={() => run(d.id, () => validerDocument(d.id),
                      'Valider ce document ? Un numéro définitif sera attribué et le document deviendra immuable.')}
                    className="text-emerald-600 hover:underline font-medium">Valider</button>
                  <button disabled={busyId === d.id}
                    onClick={() => run(d.id, () => deleteDocument(d.id), 'Supprimer ce brouillon ?')}
                    className="text-red-400 hover:underline">Suppr.</button>
                </>}
                <a href={documentPdfUrl(d.id)} target="_blank" rel="noreferrer"
                  className="text-gray-600 hover:underline">PDF</a>
                <button onClick={() => printPdf(documentPdfUrl(d.id))} title="Imprimer"
                  className="text-gray-500 hover:text-emerald-600">🖨</button>
                {tab === 'devis' && ['envoye', 'accepte'].includes(d.statut) && <>
                  {d.statut === 'envoye' && (
                    <button onClick={() => run(d.id, () => setDocumentStatut(d.id, 'accepte'))}
                      className="text-green-600 hover:underline">Accepter</button>
                  )}
                  <button onClick={() => run(d.id, () => convertirEnFacture(d.id),
                    'Créer une facture brouillon à partir de ce devis ?')}
                    className="text-emerald-600 hover:underline font-medium">→ Facture</button>
                </>}
                {estFactureTab && ['validee', 'partiellement_payee'].includes(d.statut) && (
                  <button onClick={() => setPaiementDoc(d)}
                    className="text-emerald-600 hover:underline font-medium">Paiement</button>
                )}
                {estFactureTab && ['validee', 'partiellement_payee', 'payee'].includes(d.statut) && (
                  <button onClick={() => run(d.id, () => creerAvoir(d.id),
                    'Créer un avoir brouillon (annulation totale) à partir de cette facture ?')}
                    className="text-orange-500 hover:underline">Avoir</button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={page} count={count} pageSize={20} onPage={setPage} />

      {modal && (
        <DocumentModal
          docType={config.docType.split(',')[0]}
          documentId={modal.mode === 'edit' ? modal.doc.id : null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
      {paiementDoc && (
        <PaiementModal
          document={paiementDoc}
          onClose={() => setPaiementDoc(null)}
          onSaved={() => { setPaiementDoc(null); load() }}
        />
      )}
    </div>
  )
}

// ─── Paiements tab ────────────────────────────────────────────────────────────

function PaiementsTab() {
  const [paiements, setPaiements] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPaiements({ search, page, page_size: 20 })
      setPaiements(data.results || []); setCount(data.count || 0)
    } finally { setLoading(false) }
  }, [search, page])

  useEffect(() => { load() }, [load])

  async function remove(p) {
    if (!window.confirm(`Supprimer le paiement de ${fmtMoney(p.montant)} MAD sur ${p.documentNumero} ?`)) return
    setActionError('')
    try { await deletePaiement(p.id); load() }
    catch (e) { setActionError(extractError(e)) }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input className={`${inputCls} max-w-xs`} placeholder="Rechercher… (n° facture, tiers, référence)"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </div>
      <ErrMsg error={actionError} />
      {loading ? <Loading /> : (
        <Table headers={
          <tr className="text-left text-gray-500">
            <th className="px-4 py-3">Date</th><th className="px-4 py-3">Document</th>
            <th className="px-4 py-3">Tiers</th><th className="px-4 py-3">Mode</th>
            <th className="px-4 py-3">Référence</th>
            <th className="px-4 py-3 text-right">Montant</th>
            <th className="px-4 py-3 text-right">Timbre</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        }>
          {paiements.length === 0 && <Empty cols={8} />}
          {paiements.map(p => (
            <tr key={p.id} className="border-t">
              <td className="px-4 py-3 whitespace-nowrap">{p.date_paiement}</td>
              <td className="px-4 py-3 font-medium">{p.documentNumero}</td>
              <td className="px-4 py-3">{p.tiersNom}</td>
              <td className="px-4 py-3">{p.modeDisplay}</td>
              <td className="px-4 py-3 text-gray-500">{p.reference || '—'}</td>
              <td className="px-4 py-3 text-right font-medium">{fmtMoney(p.montant)} MAD</td>
              <td className="px-4 py-3 text-right text-gray-500">
                {parseFloat(p.timbre_montant) > 0 ? fmtMoney(p.timbre_montant) : '—'}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap space-x-2 text-sm">
                <a href={paiementPdfUrl(p.id)} target="_blank" rel="noreferrer"
                  className="text-gray-600 hover:underline">Reçu</a>
                <button onClick={() => printPdf(paiementPdfUrl(p.id))} title="Imprimer le reçu"
                  className="text-gray-500 hover:text-emerald-600">🖨</button>
                <button onClick={() => remove(p)} className="text-red-400 hover:underline">Suppr.</button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={page} count={count} pageSize={20} onPage={setPage} />
    </div>
  )
}

// ─── TVA tab ──────────────────────────────────────────────────────────────────

const TRIMESTRES = ['T1 (janv–mars)', 'T2 (avr–juin)', 'T3 (juil–sept)', 'T4 (oct–déc)']
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function TvaDetailTable({ titre, rows, total }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50 font-medium text-sm text-gray-700">{titre}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="px-4 py-2">Taux</th>
            <th className="px-4 py-2 text-right">Base HT</th>
            <th className="px-4 py-2 text-right">TVA</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400">Aucun montant</td></tr>}
          {rows.map(r => (
            <tr key={r.taux} className="border-t">
              <td className="px-4 py-2">{r.taux} %</td>
              <td className="px-4 py-2 text-right">{fmtMoney(r.base)}</td>
              <td className="px-4 py-2 text-right">{fmtMoney(r.tva)}</td>
            </tr>
          ))}
          <tr className="border-t bg-gray-50 font-semibold">
            <td className="px-4 py-2">Total</td>
            <td className="px-4 py-2" />
            <td className="px-4 py-2 text-right">{fmtMoney(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function TvaTab() {
  const today = new Date()
  const [periodicite, setPeriodicite] = useState('trimestrielle')
  const [annee, setAnnee] = useState(today.getFullYear())
  const [periode, setPeriode] = useState(Math.floor(today.getMonth() / 3) + 1)
  const [regime, setRegime] = useState('encaissement')
  const [rapport, setRapport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paramsLoaded, setParamsLoaded] = useState(false)

  useEffect(() => {
    getSociete().then(s => {
      setPeriodicite(s.tva_periodicite || 'trimestrielle')
      setRegime(s.tva_regime || 'encaissement')
      setParamsLoaded(true)
    }).catch(() => setParamsLoaded(true))
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      setRapport(await getTvaRapport({ annee, periode, periodicite, regime }))
    } catch (e) { setError(extractError(e)) } finally { setLoading(false) }
  }, [annee, periode, periodicite, regime])

  useEffect(() => { if (paramsLoaded) load() }, [paramsLoaded, load])

  const nbPeriodes = periodicite === 'mensuelle' ? 12 : 4
  const exportParams = { annee, periode, periodicite, regime }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <Field label="Périodicité" className="mb-0">
          <Select value={periodicite} style={{ width: 'auto' }}
            onChange={e => { setPeriodicite(e.target.value); setPeriode(1) }}>
            <option value="trimestrielle">Trimestrielle</option>
            <option value="mensuelle">Mensuelle (CA ≥ 1 MDH)</option>
          </Select>
        </Field>
        <Field label="Année" className="mb-0">
          <Input type="number" value={annee} style={{ width: '100px' }}
            onChange={e => setAnnee(e.target.value)} />
        </Field>
        <Field label="Période" className="mb-0">
          <Select value={periode} style={{ width: 'auto' }}
            onChange={e => setPeriode(e.target.value)}>
            {Array.from({ length: nbPeriodes }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {periodicite === 'mensuelle' ? MOIS[i] : TRIMESTRES[i]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Régime" className="mb-0">
          <Select value={regime} style={{ width: 'auto' }} onChange={e => setRegime(e.target.value)}>
            <option value="encaissement">Encaissement (droit commun)</option>
            <option value="debit">Débits (sur option)</option>
          </Select>
        </Field>
        <div className="flex-1" />
        <a href={tvaExportXlsxUrl(exportParams)} download
          className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 text-gray-600">⬇ Export Excel</a>
        <a href={tvaReleveDeductionsUrl({ annee, periode, periodicite })} download
          className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          ⬇ Relevé déductions (XML Simpl-TVA)
        </a>
      </div>

      <ErrMsg error={error} />
      {loading || !rapport ? <Loading /> : (
        <>
          <p className="text-xs text-gray-500">
            Période du {rapport.date_from} au {rapport.date_to} — régime {regime === 'debit' ? 'des débits' : "de l'encaissement"}.
            TVA déductible calculée sur les paiements fournisseurs (art. 101-3° CGI).
          </p>
          <div className="grid lg:grid-cols-2 gap-4">
            <TvaDetailTable titre="TVA collectée (ventes)" rows={rapport.collectee} total={rapport.total_collectee} />
            <TvaDetailTable titre="TVA déductible (achats payés)" rows={rapport.deductible} total={rapport.total_deductible} />
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <StatCard label="TVA due" value={rapport.tva_due}
              accent={rapport.tva_due > 0 ? 'text-red-600' : 'text-gray-800'} />
            <StatCard label="Crédit de TVA" value={rapport.credit_tva}
              accent={rapport.credit_tva > 0 ? 'text-emerald-700' : 'text-gray-800'} />
          </div>
        </>
      )}
    </div>
  )
}

// ─── Tiers tab ────────────────────────────────────────────────────────────────

const TIERS_VIDE = {
  code: '', raison_sociale: '', est_client: true, est_fournisseur: false,
  est_particulier: false, ice: '', if_fiscal: '', rc: '', tp: '',
  adresse: '', ville: '', pays: 'Maroc', contact: '', telephone: '', email: '',
  delai_paiement_jours: 0, actif: true, notes: '',
}

function TiersModal({ tiers, onClose, onSaved }) {
  const [form, setForm] = useState(tiers ? { ...tiers } : TIERS_VIDE)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      if (tiers) await updateTiers(tiers.id, form)
      else await createTiers(form)
      onSaved()
    } catch (err) { setError(extractError(err)) } finally { setSaving(false) }
  }

  return (
    <Modal title={tiers ? `Modifier ${tiers.code}` : 'Nouveau tiers'} onClose={onClose} wide>
      <ErrMsg error={error} />
      <form onSubmit={submit}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Code" required>
            <Input value={form.code} onChange={e => set('code', e.target.value)} required placeholder="CLI-001" />
          </Field>
          <Field label="Raison sociale" required>
            <Input value={form.raison_sociale} onChange={e => set('raison_sociale', e.target.value)} required />
          </Field>
        </div>
        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.est_client} onChange={e => set('est_client', e.target.checked)} /> Client
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.est_fournisseur} onChange={e => set('est_fournisseur', e.target.checked)} /> Fournisseur
          </label>
          <label className="flex items-center gap-2 text-sm" title="Un particulier n'a pas d'ICE — l'ICE ne sera pas exigé à la facturation">
            <input type="checkbox" checked={form.est_particulier} onChange={e => set('est_particulier', e.target.checked)} /> Particulier (sans ICE)
          </label>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Field label="ICE (15 chiffres)">
            <Input value={form.ice} onChange={e => set('ice', e.target.value)} maxLength={15} placeholder="001234567000089" />
          </Field>
          <Field label="IF"><Input value={form.if_fiscal} onChange={e => set('if_fiscal', e.target.value)} /></Field>
          <Field label="RC"><Input value={form.rc} onChange={e => set('rc', e.target.value)} /></Field>
          <Field label="TP"><Input value={form.tp} onChange={e => set('tp', e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Adresse"><Textarea value={form.adresse} onChange={e => set('adresse', e.target.value)} rows={2} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ville"><Input value={form.ville} onChange={e => set('ville', e.target.value)} /></Field>
            <Field label="Pays"><Input value={form.pays} onChange={e => set('pays', e.target.value)} /></Field>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Field label="Contact"><Input value={form.contact} onChange={e => set('contact', e.target.value)} /></Field>
          <Field label="Téléphone"><Input value={form.telephone} onChange={e => set('telephone', e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></Field>
          <Field label="Délai de paiement (jours)">
            <Select value={form.delai_paiement_jours} onChange={e => set('delai_paiement_jours', e.target.value)}>
              <option value={0}>Comptant</option>
              <option value={30}>30 jours</option>
              <option value={60}>60 jours</option>
              <option value={90}>90 jours</option>
            </Select>
          </Field>
        </div>
        <div className="flex items-center gap-6 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.actif} onChange={e => set('actif', e.target.checked)} /> Actif
          </label>
        </div>
        <Field label="Notes"><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
        <FormActions onClose={onClose} saving={saving} />
      </form>
    </Modal>
  )
}

function TiersTab() {
  const [tiers, setTiers] = useState([])
  const [search, setSearch] = useState('')
  const [typeFiltre, setTypeFiltre] = useState('')
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)   // null | {tiers}
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { search, page, page_size: 20 }
      if (typeFiltre) params.type = typeFiltre
      const data = await getTiers(params)
      setTiers(data.results || []); setCount(data.count || 0)
    } finally { setLoading(false) }
  }, [search, typeFiltre, page])

  useEffect(() => { load() }, [load])

  async function remove(t) {
    if (!window.confirm(`Supprimer le tiers ${t.code} — ${t.raison_sociale} ?`)) return
    setActionError('')
    try { await deleteTiers(t.id); load() }
    catch (e) { setActionError(extractError(e)) }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input className={`${inputCls} max-w-xs`} placeholder="Rechercher… (code, nom, ICE)"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <Select value={typeFiltre} style={{ width: 'auto' }}
          onChange={e => { setTypeFiltre(e.target.value); setPage(1) }}>
          <option value="">Clients & fournisseurs</option>
          <option value="client">Clients</option>
          <option value="fournisseur">Fournisseurs</option>
        </Select>
        <div className="flex-1" />
        <AddBtn onClick={() => setModal({ tiers: null })} label="+ Nouveau tiers" />
      </div>
      <ErrMsg error={actionError} />
      {loading ? <Loading /> : (
        <Table headers={
          <tr className="text-left text-gray-500">
            <th className="px-4 py-3">Code</th><th className="px-4 py-3">Raison sociale</th>
            <th className="px-4 py-3">ICE</th><th className="px-4 py-3">IF</th>
            <th className="px-4 py-3">Ville</th><th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Délai</th><th className="px-4 py-3">Docs</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        }>
          {tiers.length === 0 && <Empty cols={9} />}
          {tiers.map(t => (
            <tr key={t.id} className={`border-t ${!t.actif ? 'opacity-50' : ''}`}>
              <td className="px-4 py-3 font-medium">{t.code}</td>
              <td className="px-4 py-3">{t.raison_sociale}</td>
              <td className="px-4 py-3 font-mono text-xs">{t.ice || (t.est_particulier ? 'particulier' : '—')}</td>
              <td className="px-4 py-3">{t.if_fiscal || '—'}</td>
              <td className="px-4 py-3">{t.ville || '—'}</td>
              <td className="px-4 py-3 space-x-1">
                {t.est_client && <Badge color="bg-blue-100 text-blue-700">Client</Badge>}
                {t.est_fournisseur && <Badge color="bg-purple-100 text-purple-700">Fournisseur</Badge>}
              </td>
              <td className="px-4 py-3">{t.delai_paiement_jours > 0 ? `${t.delai_paiement_jours} j` : 'Comptant'}</td>
              <td className="px-4 py-3">{t.nbDocuments}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button onClick={() => setModal({ tiers: t })} className="text-blue-500 hover:underline mr-3 text-sm">Modifier</button>
                <button onClick={() => remove(t)} className="text-red-400 hover:underline text-sm">Suppr.</button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={page} count={count} pageSize={20} onPage={setPage} />
      {modal && (
        <TiersModal tiers={modal.tiers} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }} />
      )}
    </div>
  )
}

// ─── Exercices comptables (clôture / réouverture) ────────────────────────────

function ExercicesSection() {
  const [exercices, setExercices] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(() => {
    getExercices().then(setExercices).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  async function basculer(exercice) {
    const cloture = exercice.statut === 'cloture'
    const message = cloture
      ? `Rouvrir l'exercice ${exercice.annee} ?`
      : `Clôturer l'exercice ${exercice.annee} ? Plus aucune validation, paiement ou écriture daté de ${exercice.annee} ne sera possible.`
    if (!window.confirm(message)) return
    setError('')
    try {
      const res = cloture
        ? await rouvrirExercice(exercice.annee)
        : await cloturerExercice(exercice.annee)
      if (res.avertissement) window.alert(res.avertissement)
      load()
    } catch (e) { setError(extractError(e)) }
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-800 mb-1">Exercices comptables</h3>
      <p className="text-xs text-gray-500 mb-2">
        La clôture verrouille l'exercice : plus aucune validation de document,
        paiement ou écriture daté de l'année clôturée.
      </p>
      <ErrMsg error={error} />
      <Table headers={
        <tr className="text-left text-gray-500">
          <th className="px-4 py-2">Exercice</th><th className="px-4 py-2">Statut</th>
          <th className="px-4 py-2">Clôturé le</th>
          <th className="px-4 py-2 text-right">Actions</th>
        </tr>
      }>
        {exercices.map(e => (
          <tr key={e.annee} className="border-t">
            <td className="px-4 py-2.5 font-medium">{e.annee}</td>
            <td className="px-4 py-2.5">
              {e.statut === 'cloture'
                ? <Badge color="bg-red-100 text-red-700">Clôturé</Badge>
                : <Badge color="bg-green-100 text-green-700">Ouvert</Badge>}
            </td>
            <td className="px-4 py-2.5 text-gray-500">
              {e.cloture_at ? new Date(e.cloture_at).toLocaleDateString('fr-FR') : '—'}
            </td>
            <td className="px-4 py-2.5 text-right">
              <button onClick={() => basculer(e)}
                className={`text-sm hover:underline ${e.statut === 'cloture' ? 'text-emerald-600' : 'text-red-500'}`}>
                {e.statut === 'cloture' ? 'Rouvrir' : 'Clôturer'}
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}

// ─── Paramètres tab (profil société + codes TVA) ─────────────────────────────

function TaxCodeRow({ tc, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(tc)
  const [error, setError] = useState('')

  async function save() {
    setError('')
    try {
      await updateTaxCode(tc.id, {
        libelle: form.libelle, taux: form.taux,
        actif: form.actif, mention_legale: form.mention_legale,
      })
      setEditing(false); onSaved()
    } catch (e) { setError(extractError(e)) }
  }

  if (!editing) {
    return (
      <tr className={`border-t ${!tc.actif ? 'opacity-50' : ''}`}>
        <td className="px-4 py-2 font-mono text-xs">{tc.code}</td>
        <td className="px-4 py-2">{tc.libelle}</td>
        <td className="px-4 py-2 text-right">{parseFloat(tc.taux)} %</td>
        <td className="px-4 py-2">{tc.actif ? <Badge color="bg-green-100 text-green-700">Actif</Badge> : <Badge color="bg-gray-100 text-gray-500">Inactif</Badge>}</td>
        <td className="px-4 py-2 text-xs text-gray-500 max-w-[220px] truncate">{tc.mention_legale}</td>
        <td className="px-4 py-2 text-right">
          <button onClick={() => { setForm(tc); setEditing(true) }} className="text-blue-500 hover:underline text-sm">Modifier</button>
        </td>
      </tr>
    )
  }
  return (
    <tr className="border-t bg-emerald-50/40">
      <td className="px-4 py-2 font-mono text-xs">{tc.code}</td>
      <td className="px-4 py-2"><Input value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} /></td>
      <td className="px-4 py-2"><Input type="number" step="0.01" value={form.taux} onChange={e => setForm(f => ({ ...f, taux: e.target.value }))} /></td>
      <td className="px-4 py-2">
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} /> Actif
        </label>
      </td>
      <td className="px-4 py-2"><Input value={form.mention_legale} onChange={e => setForm(f => ({ ...f, mention_legale: e.target.value }))} /></td>
      <td className="px-4 py-2 text-right whitespace-nowrap">
        {error && <span className="text-red-500 text-xs mr-2">{error}</span>}
        <button onClick={save} className="text-emerald-600 hover:underline text-sm mr-2">OK</button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:underline text-sm">Annuler</button>
      </td>
    </tr>
  )
}

function ParametresTab() {
  const [societe, setSociete] = useState(null)
  const [taxCodes, setTaxCodes] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [newTax, setNewTax] = useState(null)

  const load = useCallback(async () => {
    const [s, t] = await Promise.all([getSociete(), getTaxCodes()])
    setSociete(s); setTaxCodes(t.results || t)
  }, [])

  useEffect(() => { load() }, [load])

  const set = (k, v) => { setSociete(s => ({ ...s, [k]: v })); setSaved(false) }

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const { logo, ...payload } = societe
      await updateSociete(payload)
      setSaved(true)
    } catch (err) { setError(extractError(err)) } finally { setSaving(false) }
  }

  async function addTax(e) {
    e.preventDefault()
    setError('')
    try {
      await createTaxCode(newTax)
      setNewTax(null); load()
    } catch (err) { setError(extractError(err)) }
  }

  if (!societe) return <Loading />
  return (
    <div className="space-y-8 max-w-4xl">
      <form onSubmit={submit} className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-800 mb-1">Profil société</h3>
        <p className="text-xs text-gray-500 mb-4">
          Ces informations figurent sur vos factures — mentions obligatoires de l'article 145 du CGI.
        </p>
        <ErrMsg error={error} />
        <div className="grid grid-cols-3 gap-4">
          <Field label="Raison sociale" required>
            <Input value={societe.raison_sociale} onChange={e => set('raison_sociale', e.target.value)} required />
          </Field>
          <Field label="Forme juridique">
            <Input value={societe.forme_juridique} onChange={e => set('forme_juridique', e.target.value)} placeholder="SARL" />
          </Field>
          <Field label="Capital social (MAD)">
            <Input type="number" step="0.01" value={societe.capital_social ?? ''} onChange={e => set('capital_social', e.target.value || null)} />
          </Field>
        </div>
        <div className="grid grid-cols-5 gap-4">
          <Field label="ICE (15 chiffres)">
            <Input value={societe.ice} onChange={e => set('ice', e.target.value)} maxLength={15} />
          </Field>
          <Field label="IF"><Input value={societe.if_fiscal} onChange={e => set('if_fiscal', e.target.value)} /></Field>
          <Field label="RC"><Input value={societe.rc} onChange={e => set('rc', e.target.value)} /></Field>
          <Field label="TP"><Input value={societe.tp} onChange={e => set('tp', e.target.value)} /></Field>
          <Field label="CNSS"><Input value={societe.cnss} onChange={e => set('cnss', e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Adresse"><Textarea value={societe.adresse} onChange={e => set('adresse', e.target.value)} rows={2} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ville"><Input value={societe.ville} onChange={e => set('ville', e.target.value)} /></Field>
            <Field label="Téléphone"><Input value={societe.telephone} onChange={e => set('telephone', e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={societe.email} onChange={e => set('email', e.target.value)} /></Field>
            <Field label="Site web"><Input value={societe.site_web} onChange={e => set('site_web', e.target.value)} /></Field>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Field label="Banque"><Input value={societe.banque} onChange={e => set('banque', e.target.value)} /></Field>
          <Field label="RIB (24 chiffres)"><Input value={societe.rib} onChange={e => set('rib', e.target.value)} maxLength={24} /></Field>
          <Field label="Régime TVA">
            <Select value={societe.tva_regime} onChange={e => set('tva_regime', e.target.value)}>
              <option value="encaissement">Encaissement (droit commun)</option>
              <option value="debit">Débits (sur option)</option>
            </Select>
          </Field>
          <Field label="Périodicité TVA">
            <Select value={societe.tva_periodicite} onChange={e => set('tva_periodicite', e.target.value)}>
              <option value="trimestrielle">Trimestrielle</option>
              <option value="mensuelle">Mensuelle (CA ≥ 1 MDH)</option>
            </Select>
          </Field>
        </div>
        <Field label="Pied de page des PDF">
          <Textarea value={societe.pied_de_page} onChange={e => set('pied_de_page', e.target.value)} rows={2} />
        </Field>
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-emerald-600 text-sm">✓ Enregistré</span>}
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-800">Codes TVA</h3>
            <p className="text-xs text-gray-500">
              Depuis le 01/01/2026 seuls 20 % et 10 % sont en vigueur (réforme LF 2024-2026) — les anciens taux restent disponibles inactifs pour l'historique.
            </p>
          </div>
          <AddBtn onClick={() => setNewTax({ code: '', libelle: '', taux: '', actif: true, mention_legale: '' })} label="+ Code TVA" />
        </div>
        <Table headers={
          <tr className="text-left text-gray-500">
            <th className="px-4 py-2">Code</th><th className="px-4 py-2">Libellé</th>
            <th className="px-4 py-2 text-right">Taux</th><th className="px-4 py-2">Statut</th>
            <th className="px-4 py-2">Mention légale</th><th className="px-4 py-2 text-right">Actions</th>
          </tr>
        }>
          {taxCodes.map(tc => <TaxCodeRow key={tc.id} tc={tc} onSaved={load} />)}
        </Table>
        {newTax && (
          <Modal title="Nouveau code TVA" onClose={() => setNewTax(null)}>
            <form onSubmit={addTax}>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Code" required><Input value={newTax.code} onChange={e => setNewTax(t => ({ ...t, code: e.target.value }))} required /></Field>
                <Field label="Taux (%)" required><Input type="number" step="0.01" value={newTax.taux} onChange={e => setNewTax(t => ({ ...t, taux: e.target.value }))} required /></Field>
              </div>
              <Field label="Libellé" required><Input value={newTax.libelle} onChange={e => setNewTax(t => ({ ...t, libelle: e.target.value }))} required /></Field>
              <Field label="Mention légale (facture)"><Input value={newTax.mention_legale} onChange={e => setNewTax(t => ({ ...t, mention_legale: e.target.value }))} /></Field>
              <FormActions onClose={() => setNewTax(null)} saving={false} label="Créer" />
            </form>
          </Modal>
        )}
      </div>

      <ExercicesSection />
    </div>
  )
}

// ─── Main accounting page ─────────────────────────────────────────────────────

export default function AccountingPage({ tab, currentUser }) {
  return (
    <div className="max-w-screen-xl mx-auto px-3 sm:px-6 py-5">
      {tab === 'dashboard'  && <DashboardTab />}
      {['devis', 'factures', 'avoirs', 'achats'].includes(tab) && (
        <DocumentsTab tab={tab} currentUser={currentUser} />
      )}
      {tab === 'paiements'   && <PaiementsTab />}
      {tab === 'tva'         && <TvaTab />}
      {tab === 'ecritures'   && <EcrituresTab />}
      {tab === 'grand-livre' && <GrandLivreTab />}
      {tab === 'balance'     && <BalanceEtatsTab />}
      {tab === 'pcge'        && <PcgeTab />}
      {tab === 'tiers'       && <TiersTab />}
      {tab === 'actifs'      && <AssetLifespanTab />}
      {tab === 'parametres'  && <ParametresTab />}
      {tab === 'demandes'    && <ProcurementAccountingTab />}
    </div>
  )
}
