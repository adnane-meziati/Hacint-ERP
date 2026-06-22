import { useEffect, useRef, useState } from 'react'
import {
  createDocument, getDocument, getTaxCodes, searchArticles, searchTiers,
  updateDocument,
} from '../../api/client'
import {
  ErrMsg, Field, FormActions, Input, Modal, Select, Textarea,
  extractError, fmtMoney,
} from './AccountingPage'
import { ComptePicker } from './ComptaGeneraleTabs'

const TITRES = {
  devis:         'devis',
  facture:       'facture',
  avoir:         'avoir',
  facture_achat: "facture d'achat",
  avoir_achat:   "avoir d'achat",
}

const LIGNE_VIDE = {
  article: null, articleCode: '', designation: '',
  quantite: '1', prix_unitaire_ht: '', remise_pct: '0', tax_code: '',
}

// ─── Recherche de tiers (autocomplete) ───────────────────────────────────────

function TiersPicker({ value, label, typeTiers, onSelect }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const debounce = useRef(null)

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      try { setResults(await searchTiers(q, typeTiers)) } catch { setResults([]) }
    }, 250)
    return () => clearTimeout(debounce.current)
  }, [q, typeTiers])

  return (
    <div className="relative">
      {value ? (
        <div className="flex items-center justify-between border border-emerald-300 bg-emerald-50 rounded-lg px-3 py-2 text-sm">
          <span>
            <b>{value.code}</b> — {value.raison_sociale}
            {value.ice && <span className="text-gray-500 ml-2 font-mono text-xs">ICE {value.ice}</span>}
          </span>
          <button type="button" onClick={() => onSelect(null)}
            className="text-gray-400 hover:text-red-500 ml-2">&times;</button>
        </div>
      ) : (
        <>
          <Input placeholder={`Rechercher un ${label}… (code, nom, ICE)`}
            value={q}
            onChange={e => { setQ(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)} />
          {open && results.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {results.map(t => (
                <li key={t.id}>
                  <button type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50"
                    onClick={() => { onSelect(t); setQ(''); setOpen(false) }}>
                    <b>{t.code}</b> — {t.raison_sociale}
                    {t.ice && <span className="text-gray-400 ml-2 font-mono text-xs">{t.ice}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

// ─── Recherche d'article (par ligne) ─────────────────────────────────────────

function ArticlePicker({ ligne, onPick }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const debounce = useRef(null)

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      try { setResults(await searchArticles(q)) } catch { setResults([]) }
    }, 250)
    return () => clearTimeout(debounce.current)
  }, [q])

  if (ligne.articleCode) {
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className="font-mono bg-gray-100 rounded px-1.5 py-0.5">{ligne.articleCode}</span>
        <button type="button" onClick={() => onPick(null)}
          className="text-gray-400 hover:text-red-500">&times;</button>
      </div>
    )
  }
  return (
    <div className="relative">
      <input className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
        placeholder="Article…" value={q} onChange={e => setQ(e.target.value)} />
      {results.length > 0 && (
        <ul className="absolute z-20 left-0 mt-1 w-64 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {results.map(a => (
            <li key={a.id}>
              <button type="button"
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-emerald-50"
                onClick={() => { onPick(a); setQ(''); setResults([]) }}>
                <b>{a.code_article}</b> — {a.nom}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Modal principal ──────────────────────────────────────────────────────────

export default function DocumentModal({ docType, documentId, onClose, onSaved }) {
  const estAchat = docType === 'facture_achat' || docType === 'avoir_achat'
  const typeTiers = estAchat ? 'fournisseur' : 'client'

  const [taxCodes, setTaxCodes] = useState([])
  const [tiers, setTiers] = useState(null)
  const [compteContrepartie, setCompteContrepartie] = useState(null)
  const [form, setForm] = useState({
    date_emission: new Date().toISOString().slice(0, 10),
    date_echeance: '', reference_externe: '', objet: '',
    ras_type: 'aucune', ras_taux: '0', notes: '',
  })
  const [lignes, setLignes] = useState([{ ...LIGNE_VIDE }])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(Boolean(documentId))

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Codes TVA actifs + document existant (mode édition)
  useEffect(() => {
    getTaxCodes().then(data => {
      const codes = (data.results || data).filter(tc => tc.actif)
      setTaxCodes(codes)
      const defaut = codes.find(tc => parseFloat(tc.taux) === 20) || codes[0]
      if (defaut) {
        setLignes(ls => ls.map(l => l.tax_code ? l : { ...l, tax_code: defaut.id }))
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!documentId) return
    getDocument(documentId).then(doc => {
      setTiers({ id: doc.tiers, code: '', raison_sociale: doc.tiersNom, ice: doc.tiersIce })
      setForm({
        date_emission: doc.date_emission || '',
        date_echeance: doc.date_echeance || '',
        reference_externe: doc.reference_externe || '',
        objet: doc.objet || '',
        ras_type: doc.ras_type || 'aucune',
        ras_taux: doc.ras_taux || '0',
        notes: doc.notes || '',
      })
      setLignes(doc.lignes.map(l => ({
        article: l.article, articleCode: l.articleCode || '',
        designation: l.designation, quantite: String(l.quantite),
        prix_unitaire_ht: String(l.prix_unitaire_ht),
        remise_pct: String(l.remise_pct), tax_code: l.tax_code,
      })))
      if (doc.compte_contrepartie) {
        setCompteContrepartie({
          id: doc.compte_contrepartie,
          numero: doc.compteContrepartieNumero || '',
          intitule: '',
        })
      }
      setLoading(false)
    }).catch(e => { setError(extractError(e)); setLoading(false) })
  }, [documentId])

  // ── Totaux affichés (calcul indicatif côté client) ────────────────────────
  const totaux = lignes.reduce((acc, l) => {
    const qte = parseFloat(l.quantite) || 0
    const pu = parseFloat(l.prix_unitaire_ht) || 0
    const remise = parseFloat(l.remise_pct) || 0
    const tc = taxCodes.find(t => t.id === Number(l.tax_code))
    const taux = tc ? parseFloat(tc.taux) : 0
    const ht = qte * pu * (1 - remise / 100)
    acc.ht += ht
    acc.tva += ht * taux / 100
    return acc
  }, { ht: 0, tva: 0 })
  const ttc = totaux.ht + totaux.tva
  const rasBase = form.ras_type === 'is_ht' ? totaux.ht : form.ras_type === 'tva' ? totaux.tva : 0
  const ras = rasBase * (parseFloat(form.ras_taux) || 0) / 100
  const net = ttc - ras

  function setLigne(index, key, value) {
    setLignes(ls => ls.map((l, i) => i === index ? { ...l, [key]: value } : l))
  }

  function pickArticle(index, article) {
    setLignes(ls => ls.map((l, i) => {
      if (i !== index) return l
      if (!article) return { ...l, article: null, articleCode: '' }
      return {
        ...l, article: article.id, articleCode: article.code_article,
        designation: l.designation || article.nom,
      }
    }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!tiers) { setError(`Sélectionnez un ${typeTiers}.`); return }
    setSaving(true); setError('')
    const payload = {
      doc_type: docType,
      tiers: tiers.id,
      date_emission: form.date_emission,
      date_echeance: form.date_echeance || null,
      reference_externe: form.reference_externe,
      objet: form.objet,
      compte_contrepartie: compteContrepartie?.id || null,
      ras_type: form.ras_type,
      ras_taux: form.ras_taux || '0',
      notes: form.notes,
      lignes: lignes.map((l, i) => ({
        ordre: i,
        article: l.article || null,
        designation: l.designation,
        quantite: l.quantite,
        prix_unitaire_ht: l.prix_unitaire_ht || '0',
        remise_pct: l.remise_pct || '0',
        tax_code: l.tax_code,
      })),
    }
    try {
      if (documentId) await updateDocument(documentId, payload)
      else await createDocument(payload)
      onSaved()
    } catch (err) { setError(extractError(err)) } finally { setSaving(false) }
  }

  const titre = documentId
    ? `Modifier le brouillon (${TITRES[docType]})`
    : `Nouveau ${TITRES[docType]}`

  return (
    <Modal title={titre} onClose={onClose} wide>
      {loading ? <div className="text-center py-10 text-gray-400">Chargement...</div> : (
        <form onSubmit={submit}>
          <ErrMsg error={error} />

          <Field label={estAchat ? 'Fournisseur' : 'Client'} required>
            <TiersPicker value={tiers} label={typeTiers} typeTiers={typeTiers} onSelect={setTiers} />
          </Field>

          <div className="grid grid-cols-4 gap-4">
            <Field label="Date d'émission" required>
              <Input type="date" value={form.date_emission}
                onChange={e => set('date_emission', e.target.value)} required />
            </Field>
            {(docType === 'facture' || docType === 'facture_achat') && (
              <Field label="Échéance (vide = délai du tiers)">
                <Input type="date" value={form.date_echeance}
                  onChange={e => set('date_echeance', e.target.value)} />
              </Field>
            )}
            <Field label={estAchat ? 'N° facture fournisseur' : 'Réf. commande client'}
              required={docType === 'facture_achat'}>
              <Input value={form.reference_externe}
                onChange={e => set('reference_externe', e.target.value)}
                required={docType === 'facture_achat'} />
            </Field>
            <Field label="Objet">
              <Input value={form.objet} onChange={e => set('objet', e.target.value)} />
            </Field>
          </div>

          {/* ── Lignes ── */}
          <div className="border rounded-lg overflow-visible mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-2 py-2 text-left w-28">Article</th>
                  <th className="px-2 py-2 text-left">Désignation *</th>
                  <th className="px-2 py-2 text-right w-20">Qté</th>
                  <th className="px-2 py-2 text-right w-28">PU HT</th>
                  <th className="px-2 py-2 text-right w-20">Remise %</th>
                  <th className="px-2 py-2 w-32">TVA</th>
                  <th className="px-2 py-2 text-right w-28">Total HT</th>
                  <th className="px-2 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => {
                  const ht = (parseFloat(l.quantite) || 0) * (parseFloat(l.prix_unitaire_ht) || 0)
                    * (1 - (parseFloat(l.remise_pct) || 0) / 100)
                  return (
                    <tr key={i} className="border-t align-top">
                      <td className="px-2 py-2"><ArticlePicker ligne={l} onPick={a => pickArticle(i, a)} /></td>
                      <td className="px-2 py-2">
                        <input className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                          value={l.designation} required
                          onChange={e => setLigne(i, 'designation', e.target.value)} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.001" min="0.001"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right"
                          value={l.quantite} required
                          onChange={e => setLigne(i, 'quantite', e.target.value)} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.01"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right"
                          value={l.prix_unitaire_ht} required
                          onChange={e => setLigne(i, 'prix_unitaire_ht', e.target.value)} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.01" min="0" max="100"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right"
                          value={l.remise_pct}
                          onChange={e => setLigne(i, 'remise_pct', e.target.value)} />
                      </td>
                      <td className="px-2 py-2">
                        <select className="w-full border border-gray-200 rounded px-1 py-1 text-sm"
                          value={l.tax_code} required
                          onChange={e => setLigne(i, 'tax_code', e.target.value)}>
                          <option value="">—</option>
                          {taxCodes.map(tc => (
                            <option key={tc.id} value={tc.id}>{parseFloat(tc.taux)} %</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 text-right text-gray-600">{fmtMoney(ht)}</td>
                      <td className="px-2 py-2">
                        {lignes.length > 1 && (
                          <button type="button" onClick={() => setLignes(ls => ls.filter((_, j) => j !== i))}
                            className="text-gray-300 hover:text-red-500">&times;</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <button type="button"
              onClick={() => setLignes(ls => [...ls, {
                ...LIGNE_VIDE,
                tax_code: (taxCodes.find(tc => parseFloat(tc.taux) === 20) || taxCodes[0])?.id || '',
              }])}
              className="w-full text-left px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 border-t">
              + Ajouter une ligne
            </button>
          </div>

          {/* ── RAS + totaux ── */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <Field label={`Compte PCGE de contrepartie (défaut : ${estAchat ? '6121 Achats' : '7121 Ventes'})`}>
                <ComptePicker value={compteContrepartie} onSelect={setCompteContrepartie}
                  classe={estAchat ? '6' : '7'}
                  placeholder={`Compte de classe ${estAchat ? '6 (charges)' : '7 (produits)'}…`} />
              </Field>
              <Field label="Retenue à la source">
                <div className="flex gap-2">
                  <Select value={form.ras_type} onChange={e => set('ras_type', e.target.value)}>
                    <option value="aucune">Aucune</option>
                    <option value="is_ht">RAS sur le HT (IS / honoraires)</option>
                    <option value="tva">RAS sur la TVA</option>
                  </Select>
                  {form.ras_type !== 'aucune' && (
                    <Input type="number" step="0.01" min="0" max="100" value={form.ras_taux}
                      onChange={e => set('ras_taux', e.target.value)}
                      style={{ width: '90px' }} placeholder="%" />
                  )}
                </div>
              </Field>
              <Field label="Notes (visibles sur le PDF)">
                <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
              </Field>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1 self-start">
              <div className="flex justify-between"><span className="text-gray-500">Total HT</span><b>{fmtMoney(totaux.ht)} MAD</b></div>
              <div className="flex justify-between"><span className="text-gray-500">TVA</span><b>{fmtMoney(totaux.tva)} MAD</b></div>
              <div className="flex justify-between"><span className="text-gray-500">Total TTC</span><b>{fmtMoney(ttc)} MAD</b></div>
              {ras > 0 && <>
                <div className="flex justify-between text-orange-600"><span>RAS</span><b>- {fmtMoney(ras)} MAD</b></div>
                <div className="flex justify-between border-t pt-1"><span className="text-gray-700 font-medium">Net à payer</span><b className="text-emerald-700">{fmtMoney(net)} MAD</b></div>
              </>}
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-3">
            Le document est créé en <b>brouillon</b> (modifiable, sans numéro). La validation attribue
            un numéro séquentiel définitif et fige le document.
          </p>
          <FormActions onClose={onClose} saving={saving}
            label={documentId ? 'Enregistrer' : 'Créer le brouillon'} />
        </form>
      )}
    </Modal>
  )
}
