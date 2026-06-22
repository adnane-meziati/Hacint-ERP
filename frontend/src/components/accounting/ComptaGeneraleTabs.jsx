import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getComptes, searchComptes, createCompte, updateCompte, deleteCompte,
  getJournaux, getEcritures, getEcriture, createEcriture, deleteEcriture,
  comptabiliserTout, journalExportUrl,
  getGrandLivre, grandLivreXlsxUrl, getBalance, balanceXlsxUrl,
  getBilan, getCpc,
} from '../../api/client'
import {
  AddBtn, Badge, Empty, ErrMsg, Field, FormActions, Input, Loading, Modal,
  Pagination, Select, Table, extractError, fmtMoney, inputCls,
} from './AccountingPage'

const CLASSES_PCGE = {
  1: 'Financement permanent', 2: 'Actif immobilisé', 3: 'Actif circulant',
  4: 'Passif circulant', 5: 'Trésorerie', 6: 'Charges', 7: 'Produits',
  8: 'Comptes de résultats',
}

// ─── Sélecteur de compte (autocomplete) ───────────────────────────────────────

export function ComptePicker({ value, onSelect, classe = '', placeholder = 'Compte… (n° ou intitulé)' }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const debounce = useRef(null)

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      try { setResults(await searchComptes(q, classe)) } catch { setResults([]) }
    }, 200)
    return () => clearTimeout(debounce.current)
  }, [q, classe])

  if (value) {
    return (
      <div className="flex items-center justify-between border border-emerald-300 bg-emerald-50 rounded-lg px-3 py-2 text-sm">
        <span><b className="font-mono">{value.numero}</b> — {value.intitule}</span>
        <button type="button" onClick={() => onSelect(null)}
          className="text-gray-400 hover:text-red-500 ml-2">&times;</button>
      </div>
    )
  }
  return (
    <div className="relative">
      <Input placeholder={placeholder} value={q} onChange={e => setQ(e.target.value)} />
      {results.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map(c => (
            <li key={c.id}>
              <button type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50"
                onClick={() => { onSelect(c); setQ(''); setResults([]) }}>
                <b className="font-mono">{c.numero}</b> — {c.intitule}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Onglet Écritures ─────────────────────────────────────────────────────────

function EcritureDetailModal({ ecritureId, onClose }) {
  const [ecriture, setEcriture] = useState(null)
  useEffect(() => { getEcriture(ecritureId).then(setEcriture).catch(() => {}) }, [ecritureId])

  return (
    <Modal title={ecriture ? `Écriture ${ecriture.numero}` : 'Écriture'} onClose={onClose} wide>
      {!ecriture ? <Loading /> : (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            {ecriture.date_ecriture} — Journal {ecriture.journalCode} — {ecriture.libelle}
            {ecriture.sourceNumero && <> — Source : <b>{ecriture.sourceNumero}</b></>}
          </p>
          <Table headers={
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">Compte</th><th className="px-4 py-2">Intitulé</th>
              <th className="px-4 py-2">Libellé</th><th className="px-4 py-2">Tiers</th>
              <th className="px-4 py-2 text-right">Débit</th>
              <th className="px-4 py-2 text-right">Crédit</th>
            </tr>
          }>
            {ecriture.lignes.map(l => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-2 font-mono text-xs">{l.compteNumero}</td>
                <td className="px-4 py-2">{l.compteIntitule}</td>
                <td className="px-4 py-2 text-gray-500">{l.libelle}</td>
                <td className="px-4 py-2 text-gray-500">{l.tiersNom || '—'}</td>
                <td className="px-4 py-2 text-right">{l.debit > 0 ? fmtMoney(l.debit) : ''}</td>
                <td className="px-4 py-2 text-right">{l.credit > 0 ? fmtMoney(l.credit) : ''}</td>
              </tr>
            ))}
            <tr className="border-t bg-gray-50 font-semibold">
              <td className="px-4 py-2" colSpan={4}>Total</td>
              <td className="px-4 py-2 text-right">{fmtMoney(ecriture.totalDebit)}</td>
              <td className="px-4 py-2 text-right">{fmtMoney(ecriture.totalCredit)}</td>
            </tr>
          </Table>
        </div>
      )}
    </Modal>
  )
}

const LIGNE_OD_VIDE = { compte: null, libelle: '', debit: '', credit: '' }

function OdModal({ journaux, onClose, onSaved }) {
  const [form, setForm] = useState({
    journal: journaux.find(j => j.code === 'OD')?.id || journaux[0]?.id || '',
    date_ecriture: new Date().toISOString().slice(0, 10),
    libelle: '',
  })
  const [lignes, setLignes] = useState([{ ...LIGNE_OD_VIDE }, { ...LIGNE_OD_VIDE }])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const totalDebit  = lignes.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lignes.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const equilibre = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0

  function setLigne(index, key, value) {
    setLignes(ls => ls.map((l, i) => i === index ? { ...l, [key]: value } : l))
  }

  async function submit(e) {
    e.preventDefault()
    if (lignes.some(l => !l.compte)) { setError('Chaque ligne doit avoir un compte.'); return }
    setSaving(true); setError('')
    try {
      await createEcriture({
        journal: form.journal,
        date_ecriture: form.date_ecriture,
        libelle: form.libelle,
        lignes: lignes.map((l, i) => ({
          ordre: i, compte: l.compte.id, libelle: l.libelle,
          debit: l.debit || '0', credit: l.credit || '0',
        })),
      })
      onSaved()
    } catch (err) { setError(extractError(err)) } finally { setSaving(false) }
  }

  return (
    <Modal title="Nouvelle écriture (saisie manuelle)" onClose={onClose} wide>
      <ErrMsg error={error} />
      <form onSubmit={submit}>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Journal" required>
            <Select value={form.journal} onChange={e => setForm(f => ({ ...f, journal: e.target.value }))}>
              {journaux.map(j => <option key={j.id} value={j.id}>{j.code} — {j.libelle}</option>)}
            </Select>
          </Field>
          <Field label="Date" required>
            <Input type="date" value={form.date_ecriture} required
              onChange={e => setForm(f => ({ ...f, date_ecriture: e.target.value }))} />
          </Field>
          <Field label="Libellé" required>
            <Input value={form.libelle} required
              onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} />
          </Field>
        </div>

        <div className="border rounded-lg mb-3">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-2 py-2 text-left">Compte *</th>
                <th className="px-2 py-2 text-left w-44">Libellé ligne</th>
                <th className="px-2 py-2 text-right w-28">Débit</th>
                <th className="px-2 py-2 text-right w-28">Crédit</th>
                <th className="px-2 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="px-2 py-2">
                    <ComptePicker value={l.compte} onSelect={c => setLigne(i, 'compte', c)} />
                  </td>
                  <td className="px-2 py-2">
                    <input className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                      value={l.libelle} onChange={e => setLigne(i, 'libelle', e.target.value)} />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" step="0.01" min="0"
                      className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right"
                      value={l.debit} onChange={e => setLigne(i, 'debit', e.target.value)} />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" step="0.01" min="0"
                      className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right"
                      value={l.credit} onChange={e => setLigne(i, 'credit', e.target.value)} />
                  </td>
                  <td className="px-2 py-2">
                    {lignes.length > 2 && (
                      <button type="button" onClick={() => setLignes(ls => ls.filter((_, j) => j !== i))}
                        className="text-gray-300 hover:text-red-500">&times;</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => setLignes(ls => [...ls, { ...LIGNE_OD_VIDE }])}
            className="w-full text-left px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 border-t">
            + Ajouter une ligne
          </button>
        </div>

        <div className={`text-sm mb-4 p-3 rounded-lg ${equilibre ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'}`}>
          Débit : <b>{fmtMoney(totalDebit)}</b> — Crédit : <b>{fmtMoney(totalCredit)}</b>
          {equilibre ? ' — ✓ équilibrée' : ' — écriture déséquilibrée'}
        </div>
        <FormActions onClose={onClose} saving={saving || !equilibre} label="Enregistrer l'écriture" />
      </form>
    </Modal>
  )
}

export function EcrituresTab() {
  const [ecritures, setEcritures] = useState([])
  const [journaux, setJournaux] = useState([])
  const [journal, setJournal] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [odModal, setOdModal] = useState(false)
  const [actionError, setActionError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    getJournaux().then(d => setJournaux(d.results || d)).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: 20 }
      if (journal) params.journal = journal
      if (search) params.search = search
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const data = await getEcritures(params)
      setEcritures(data.results || []); setCount(data.count || 0)
    } finally { setLoading(false) }
  }, [journal, search, dateFrom, dateTo, page])

  useEffect(() => { load() }, [load])

  async function lancerComptabilisation() {
    setActionError(''); setInfo('')
    try {
      const res = await comptabiliserTout()
      setInfo(`Comptabilisation terminée : ${res.documents} document(s) et ${res.paiements} paiement(s) comptabilisés.`)
      load()
    } catch (e) { setActionError(extractError(e)) }
  }

  async function supprimer(ecriture) {
    if (!window.confirm(`Supprimer l'écriture ${ecriture.numero} ?`)) return
    setActionError('')
    try { await deleteEcriture(ecriture.id); load() }
    catch (e) { setActionError(extractError(e)) }
  }

  const exportParams = {}
  if (journal) exportParams.journal = journal
  if (dateFrom) exportParams.date_from = dateFrom
  if (dateTo) exportParams.date_to = dateTo

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input className={`${inputCls} max-w-[220px]`} placeholder="Rechercher… (n°, libellé)"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <Select value={journal} style={{ width: 'auto' }}
          onChange={e => { setJournal(e.target.value); setPage(1) }}>
          <option value="">Tous les journaux</option>
          {journaux.map(j => <option key={j.id} value={j.code}>{j.code} — {j.libelle}</option>)}
        </Select>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span>Du</span>
          <Input type="date" value={dateFrom} style={{ width: 'auto' }}
            onChange={e => { setDateFrom(e.target.value); setPage(1) }} />
          <span>au</span>
          <Input type="date" value={dateTo} style={{ width: 'auto' }}
            onChange={e => { setDateTo(e.target.value); setPage(1) }} />
        </div>
        <div className="flex-1" />
        <a href={journalExportUrl(exportParams)} download
          className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 text-gray-600">
          ⬇ Livre-journal (Excel)
        </a>
        <button onClick={lancerComptabilisation}
          className="px-3 py-2 text-sm border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50">
          ⚙ Comptabiliser l'existant
        </button>
        <AddBtn onClick={() => setOdModal(true)} label="+ Écriture (OD)" />
      </div>

      <ErrMsg error={actionError} />
      {info && <div className="text-emerald-700 text-sm mb-3 p-3 bg-emerald-50 rounded-lg">{info}</div>}

      {loading ? <Loading /> : (
        <Table headers={
          <tr className="text-left text-gray-500">
            <th className="px-4 py-3">N°</th><th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Journal</th><th className="px-4 py-3">Libellé</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3 text-right">Montant</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        }>
          {ecritures.length === 0 && <Empty cols={7} />}
          {ecritures.map(e => (
            <tr key={e.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-3 font-medium whitespace-nowrap">{e.numero}</td>
              <td className="px-4 py-3 whitespace-nowrap">{e.date_ecriture}</td>
              <td className="px-4 py-3"><Badge color="bg-slate-100 text-slate-700">{e.journalCode}</Badge></td>
              <td className="px-4 py-3 max-w-[280px] truncate">{e.libelle}</td>
              <td className="px-4 py-3 text-gray-500">
                {e.estGeneree ? e.sourceNumero : <Badge color="bg-purple-100 text-purple-700">Manuelle</Badge>}
              </td>
              <td className="px-4 py-3 text-right font-medium">{fmtMoney(e.totalDebit)}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap space-x-2 text-sm">
                <button onClick={() => setDetail(e.id)} className="text-blue-500 hover:underline">Voir</button>
                {!e.estGeneree && (
                  <button onClick={() => supprimer(e)} className="text-red-400 hover:underline">Suppr.</button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={page} count={count} pageSize={20} onPage={setPage} />

      {detail && <EcritureDetailModal ecritureId={detail} onClose={() => setDetail(null)} />}
      {odModal && (
        <OdModal journaux={journaux} onClose={() => setOdModal(false)}
          onSaved={() => { setOdModal(false); load() }} />
      )}
    </div>
  )
}

// ─── Onglet Grand livre ───────────────────────────────────────────────────────

export function GrandLivreTab() {
  const [compte, setCompte] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!compte) { setData(null); return }
    setLoading(true); setError('')
    try {
      const params = { compte: compte.numero }
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      setData(await getGrandLivre(params))
    } catch (e) { setError(extractError(e)) } finally { setLoading(false) }
  }, [compte, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  const exportParams = compte ? { compte: compte.numero } : {}
  if (dateFrom) exportParams.date_from = dateFrom
  if (dateTo) exportParams.date_to = dateTo

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="w-80"><ComptePicker value={compte} onSelect={setCompte} /></div>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span>Du</span>
          <Input type="date" value={dateFrom} style={{ width: 'auto' }}
            onChange={e => setDateFrom(e.target.value)} />
          <span>au</span>
          <Input type="date" value={dateTo} style={{ width: 'auto' }}
            onChange={e => setDateTo(e.target.value)} />
        </div>
        <div className="flex-1" />
        {compte && (
          <a href={grandLivreXlsxUrl(exportParams)} download
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 text-gray-600">
            ⬇ Export Excel
          </a>
        )}
      </div>

      <ErrMsg error={error} />
      {!compte && <p className="text-gray-400 text-sm py-8 text-center">Sélectionnez un compte pour afficher son grand livre.</p>}
      {loading && <Loading />}
      {data && !loading && (
        <>
          <p className="text-sm text-gray-500 mb-2">
            <b className="font-mono">{data.compte.numero}</b> — {data.compte.intitule}
            {data.report !== 0 && <> — Report : <b>{fmtMoney(data.report)}</b></>}
          </p>
          <Table headers={
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3">Date</th><th className="px-4 py-3">Écriture</th>
              <th className="px-4 py-3">Jnl</th><th className="px-4 py-3">Libellé</th>
              <th className="px-4 py-3">Tiers</th>
              <th className="px-4 py-3 text-right">Débit</th>
              <th className="px-4 py-3 text-right">Crédit</th>
              <th className="px-4 py-3 text-right">Solde</th>
            </tr>
          }>
            {data.lignes.length === 0 && <Empty cols={8} msg="Aucun mouvement sur la période" />}
            {data.lignes.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-2 whitespace-nowrap">{l.date}</td>
                <td className="px-4 py-2 font-medium whitespace-nowrap">{l.ecriture}</td>
                <td className="px-4 py-2">{l.journal}</td>
                <td className="px-4 py-2 max-w-[260px] truncate">{l.libelle}</td>
                <td className="px-4 py-2 text-gray-500">{l.tiers || '—'}</td>
                <td className="px-4 py-2 text-right">{l.debit > 0 ? fmtMoney(l.debit) : ''}</td>
                <td className="px-4 py-2 text-right">{l.credit > 0 ? fmtMoney(l.credit) : ''}</td>
                <td className={`px-4 py-2 text-right font-medium ${l.solde < 0 ? 'text-red-600' : ''}`}>{fmtMoney(l.solde)}</td>
              </tr>
            ))}
            <tr className="border-t bg-gray-50 font-semibold">
              <td className="px-4 py-2" colSpan={5}>Total période</td>
              <td className="px-4 py-2 text-right">{fmtMoney(data.total_debit)}</td>
              <td className="px-4 py-2 text-right">{fmtMoney(data.total_credit)}</td>
              <td className="px-4 py-2 text-right">{fmtMoney(data.solde_final)}</td>
            </tr>
          </Table>
        </>
      )}
    </div>
  )
}

// ─── Onglet Balance & États (balance / bilan / CPC) ───────────────────────────

function BalanceView() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      setData(await getBalance(params))
    } finally { setLoading(false) }
  }, [dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  const exportParams = {}
  if (dateFrom) exportParams.date_from = dateFrom
  if (dateTo) exportParams.date_to = dateTo

  let derniereClasse = null
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span>Du</span>
          <Input type="date" value={dateFrom} style={{ width: 'auto' }} onChange={e => setDateFrom(e.target.value)} />
          <span>au</span>
          <Input type="date" value={dateTo} style={{ width: 'auto' }} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div className="flex-1" />
        <a href={balanceXlsxUrl(exportParams)} download
          className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 text-gray-600">⬇ Export Excel</a>
      </div>
      {loading || !data ? <Loading /> : (
        <>
          {!data.equilibree && (
            <div className="text-red-600 text-sm mb-3 p-3 bg-red-50 rounded-lg">
              ⚠ Balance déséquilibrée — vérifiez les écritures.
            </div>
          )}
          <Table headers={
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3">Compte</th><th className="px-4 py-3">Intitulé</th>
              <th className="px-4 py-3 text-right">Débit</th>
              <th className="px-4 py-3 text-right">Crédit</th>
              <th className="px-4 py-3 text-right">Solde débiteur</th>
              <th className="px-4 py-3 text-right">Solde créditeur</th>
            </tr>
          }>
            {data.comptes.length === 0 && <Empty cols={6} msg="Aucune écriture" />}
            {data.comptes.map(c => {
              const enteteClasse = c.classe !== derniereClasse
              derniereClasse = c.classe
              return [
                enteteClasse && (
                  <tr key={`cl-${c.classe}`} className="bg-slate-100">
                    <td colSpan={6} className="px-4 py-1.5 text-xs font-semibold text-slate-600 uppercase">
                      Classe {c.classe} — {CLASSES_PCGE[c.classe]}
                    </td>
                  </tr>
                ),
                <tr key={c.numero} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{c.numero}</td>
                  <td className="px-4 py-2">{c.intitule}</td>
                  <td className="px-4 py-2 text-right">{fmtMoney(c.debit)}</td>
                  <td className="px-4 py-2 text-right">{fmtMoney(c.credit)}</td>
                  <td className="px-4 py-2 text-right">{c.solde_debiteur ? fmtMoney(c.solde_debiteur) : ''}</td>
                  <td className="px-4 py-2 text-right">{c.solde_crediteur ? fmtMoney(c.solde_crediteur) : ''}</td>
                </tr>,
              ]
            })}
            <tr className="border-t bg-gray-50 font-semibold">
              <td className="px-4 py-2" colSpan={2}>TOTAL</td>
              <td className="px-4 py-2 text-right">{fmtMoney(data.totaux.debit)}</td>
              <td className="px-4 py-2 text-right">{fmtMoney(data.totaux.credit)}</td>
              <td className="px-4 py-2 text-right">{fmtMoney(data.totaux.solde_debiteur)}</td>
              <td className="px-4 py-2 text-right">{fmtMoney(data.totaux.solde_crediteur)}</td>
            </tr>
          </Table>
        </>
      )}
    </div>
  )
}

function BilanView() {
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState(null)

  useEffect(() => {
    getBilan(dateTo).then(setData).catch(() => {})
  }, [dateTo])

  function Colonne({ titre, postes, total }) {
    return (
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 font-medium text-sm text-gray-700">{titre}</div>
        <table className="w-full text-sm">
          <tbody>
            {postes.map(p => (
              <tr key={p.numero} className="border-t">
                <td className="px-4 py-2 font-mono text-xs w-20">{p.numero}</td>
                <td className="px-4 py-2">{p.intitule}</td>
                <td className="px-4 py-2 text-right">{fmtMoney(p.montant)}</td>
              </tr>
            ))}
            <tr className="border-t bg-gray-50 font-semibold">
              <td className="px-4 py-2" colSpan={2}>Total {titre.toLowerCase()}</td>
              <td className="px-4 py-2 text-right">{fmtMoney(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-500">Bilan au</span>
        <Input type="date" value={dateTo} style={{ width: 'auto' }} onChange={e => setDateTo(e.target.value)} />
        {data && (data.equilibre
          ? <Badge color="bg-emerald-100 text-emerald-700">✓ Actif = Passif</Badge>
          : <Badge color="bg-red-100 text-red-700">⚠ Déséquilibré</Badge>)}
      </div>
      {!data ? <Loading /> : (
        <div className="grid lg:grid-cols-2 gap-4">
          <Colonne titre="Actif" postes={data.actif} total={data.total_actif} />
          <Colonne titre="Passif" postes={data.passif} total={data.total_passif} />
        </div>
      )}
    </div>
  )
}

function CpcView() {
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [data, setData] = useState(null)

  useEffect(() => {
    getCpc(annee).then(setData).catch(() => {})
  }, [annee])

  function Colonne({ titre, comptes, total, champ }) {
    return (
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 font-medium text-sm text-gray-700">{titre}</div>
        <table className="w-full text-sm">
          <tbody>
            {comptes.map(c => {
              const montant = champ === 'produits' ? c.credit - c.debit : c.debit - c.credit
              return (
                <tr key={c.numero} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs w-20">{c.numero}</td>
                  <td className="px-4 py-2">{c.intitule}</td>
                  <td className="px-4 py-2 text-right">{fmtMoney(montant)}</td>
                </tr>
              )
            })}
            <tr className="border-t bg-gray-50 font-semibold">
              <td className="px-4 py-2" colSpan={2}>Total</td>
              <td className="px-4 py-2 text-right">{fmtMoney(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-500">Exercice</span>
        <Input type="number" value={annee} style={{ width: '100px' }}
          onChange={e => setAnnee(e.target.value)} />
        {data && (
          <Badge color={data.resultat >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
            Résultat : {fmtMoney(data.resultat)} MAD
          </Badge>
        )}
      </div>
      {!data ? <Loading /> : (
        <div className="grid lg:grid-cols-2 gap-4">
          <Colonne titre="Produits (classe 7)" comptes={data.produits} total={data.total_produits} champ="produits" />
          <Colonne titre="Charges (classe 6)" comptes={data.charges} total={data.total_charges} champ="charges" />
        </div>
      )}
    </div>
  )
}

export function BalanceEtatsTab() {
  const [vue, setVue] = useState('balance')
  return (
    <div>
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {[['balance', 'Balance'], ['bilan', 'Bilan'], ['cpc', 'CPC']].map(([id, label]) => (
          <button key={id} onClick={() => setVue(id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              vue === id ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>
      {vue === 'balance' && <BalanceView />}
      {vue === 'bilan' && <BilanView />}
      {vue === 'cpc' && <CpcView />}
    </div>
  )
}

// ─── Onglet Plan comptable ────────────────────────────────────────────────────

const COMPTE_VIDE = { numero: '', intitule: '', actif: true }

function CompteModal({ compte, onClose, onSaved }) {
  const [form, setForm] = useState(compte ? { ...compte } : COMPTE_VIDE)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      if (compte) await updateCompte(compte.id, {
        intitule: form.intitule, actif: form.actif })
      else await createCompte(form)
      onSaved()
    } catch (err) { setError(extractError(err)) } finally { setSaving(false) }
  }

  return (
    <Modal title={compte ? `Modifier ${compte.numero}` : 'Nouveau compte PCGE'} onClose={onClose}>
      <ErrMsg error={error} />
      <form onSubmit={submit}>
        <Field label="Numéro (commence par la classe 1-8)" required>
          <Input value={form.numero} required disabled={Boolean(compte)}
            onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
            placeholder="6125" maxLength={10} />
        </Field>
        <Field label="Intitulé" required>
          <Input value={form.intitule} required
            onChange={e => setForm(f => ({ ...f, intitule: e.target.value }))} />
        </Field>
        <label className="flex items-center gap-2 text-sm mb-4">
          <input type="checkbox" checked={form.actif}
            onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} /> Actif
        </label>
        <FormActions onClose={onClose} saving={saving} />
      </form>
    </Modal>
  )
}

export function PcgeTab() {
  const [comptes, setComptes] = useState([])
  const [search, setSearch] = useState('')
  const [classe, setClasse] = useState('')
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: 50 }
      if (search) params.search = search
      if (classe) params.classe = classe
      const data = await getComptes(params)
      setComptes(data.results || []); setCount(data.count || 0)
    } finally { setLoading(false) }
  }, [search, classe, page])

  useEffect(() => { load() }, [load])

  async function remove(compte) {
    if (!window.confirm(`Supprimer le compte ${compte.numero} — ${compte.intitule} ?`)) return
    setActionError('')
    try { await deleteCompte(compte.id); load() }
    catch (e) { setActionError(extractError(e)) }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input className={`${inputCls} max-w-xs`} placeholder="Rechercher… (n°, intitulé)"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <Select value={classe} style={{ width: 'auto' }}
          onChange={e => { setClasse(e.target.value); setPage(1) }}>
          <option value="">Toutes les classes</option>
          {Object.entries(CLASSES_PCGE).map(([num, libelle]) => (
            <option key={num} value={num}>Classe {num} — {libelle}</option>
          ))}
        </Select>
        <div className="flex-1" />
        <AddBtn onClick={() => setModal({ compte: null })} label="+ Nouveau compte" />
      </div>
      <ErrMsg error={actionError} />
      {loading ? <Loading /> : (
        <Table headers={
          <tr className="text-left text-gray-500">
            <th className="px-4 py-3">Numéro</th><th className="px-4 py-3">Intitulé</th>
            <th className="px-4 py-3">Classe</th><th className="px-4 py-3">Écritures</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        }>
          {comptes.length === 0 && <Empty cols={6} />}
          {comptes.map(c => (
            <tr key={c.id} className={`border-t ${!c.actif ? 'opacity-50' : ''}`}>
              <td className="px-4 py-2.5 font-mono text-sm font-medium">{c.numero}</td>
              <td className="px-4 py-2.5">{c.intitule}</td>
              <td className="px-4 py-2.5 text-gray-500 text-xs">{c.classe} — {CLASSES_PCGE[c.classe]}</td>
              <td className="px-4 py-2.5">{c.nbLignes}</td>
              <td className="px-4 py-2.5">
                {c.actif ? <Badge color="bg-green-100 text-green-700">Actif</Badge>
                  : <Badge color="bg-gray-100 text-gray-500">Inactif</Badge>}
              </td>
              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                <button onClick={() => setModal({ compte: c })}
                  className="text-blue-500 hover:underline mr-3 text-sm">Modifier</button>
                <button onClick={() => remove(c)}
                  className="text-red-400 hover:underline text-sm">Suppr.</button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={page} count={count} pageSize={50} onPage={setPage} />
      {modal && (
        <CompteModal compte={modal.compte} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }} />
      )}
    </div>
  )
}
