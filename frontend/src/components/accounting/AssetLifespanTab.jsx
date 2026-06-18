import { useCallback, useEffect, useState } from 'react'
import { getAssetLifespan, createAsset, updateAsset, deleteAsset } from '../../api/client'
import {
  Modal, Field, Input, Table, AddBtn, ErrMsg, extractError, Loading, FormActions, fmtMoney,
} from './AccountingPage'

function ProgressBar({ pct }) {
  // pct = % REMAINING (100 = new, 0 = fully deprecated)
  const color = pct <= 15 ? 'bg-red-500' : pct <= 35 ? 'bg-orange-500' : 'bg-emerald-500'
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function KpiCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || 'text-gray-800'}`}>{value}</p>
    </div>
  )
}

const today = () => new Date().toISOString().slice(0, 10)
const VIDE = { name: '', valeur_initiale: '', duree_annees: '', date_debut: '' }

function AssetModal({ asset, onClose, onSaved }) {
  const [form, setForm] = useState(asset
    ? { name: asset.name, valeur_initiale: asset.valeur_initiale, duree_annees: asset.duree_annees, date_debut: asset.date_debut || today() }
    : { ...VIDE, date_debut: today() })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const payload = {
        name: form.name,
        valeur_initiale: parseFloat(form.valeur_initiale),
        duree_annees: parseInt(form.duree_annees, 10),
        date_debut: form.date_debut || null,
      }
      if (asset) await updateAsset(asset.id, payload)
      else await createAsset(payload)
      onSaved()
    } catch (err) { setError(extractError(err)) } finally { setSaving(false) }
  }

  const valeur = parseFloat(form.valeur_initiale) || 0
  const annees = parseInt(form.duree_annees, 10) || 0
  const totalMois = annees * 12
  const amortMensuel = totalMois > 0 ? (valeur / totalMois).toFixed(2) : null
  const pctMensuel  = totalMois > 0 ? (100 / totalMois).toFixed(4) : null

  return (
    <Modal title={asset ? `Modifier — ${asset.name}` : 'Nouveau devis / actif'} onClose={onClose}>
      <ErrMsg error={error} />
      <form onSubmit={submit}>
        <Field label="Nom du devis / actif" required>
          <Input value={form.name} onChange={e => set('name', e.target.value)} required
            placeholder="Ex : CNC Haas VF-2" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Valeur initiale (MAD)" required>
            <Input type="number" step="0.01" min="0.01" value={form.valeur_initiale}
              onChange={e => set('valeur_initiale', e.target.value)} required />
          </Field>
          <Field label="Durée de vie (années)" required>
            <Input type="number" min="1" step="1" value={form.duree_annees}
              onChange={e => set('duree_annees', e.target.value)} required />
          </Field>
        </div>
        <Field label="Date de mise en service">
          <Input type="date" value={form.date_debut}
            onChange={e => set('date_debut', e.target.value)} />
        </Field>

        {amortMensuel && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-sm">
            <p className="font-medium text-emerald-800 mb-1">Aperçu de l'amortissement</p>
            <div className="grid grid-cols-3 gap-2 text-emerald-700">
              <span>Durée : <b>{totalMois} mois</b></span>
              <span>Perte / mois : <b>{fmtMoney(amortMensuel)} MAD</b></span>
              <span>% / mois : <b>{pctMensuel} %</b></span>
            </div>
          </div>
        )}

        <FormActions onClose={onClose} saving={saving} />
      </form>
    </Modal>
  )
}

export default function AssetLifespanTab() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [modal, setModal]     = useState(null)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await getAssetLifespan()) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function remove(asset) {
    if (!window.confirm(`Supprimer « ${asset.name} » ?`)) return
    setActionError('')
    try { await deleteAsset(asset.id); load() }
    catch (e) { setActionError(extractError(e)) }
  }

  if (loading && !data) return <Loading />
  if (!data) return null

  const { summary, assets } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Amortissement des actifs</h2>
        <AddBtn onClick={() => setModal({ asset: null })} label="+ Nouveau devis" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total actifs" value={summary.total_assets} />
        <KpiCard label="Valeur initiale totale"
          value={`${fmtMoney(summary.total_valeur_initiale)} MAD`} />
        <KpiCard label="Valeur actuelle totale"
          value={`${fmtMoney(summary.total_valeur_actuelle)} MAD`}
          accent={summary.total_valeur_actuelle < summary.total_valeur_initiale
            ? 'text-orange-600' : 'text-emerald-700'} />
      </div>

      <ErrMsg error={actionError} />

      {assets.length === 0 && (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
          Aucun actif enregistré. Ajoutez un devis pour suivre son amortissement.
        </div>
      )}

      {assets.length > 0 && (
        <Table headers={
          <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
            <th className="px-4 py-3">Nom</th>
            <th className="px-4 py-3 text-right">Valeur initiale</th>
            <th className="px-4 py-3 text-right">Durée</th>
            <th className="px-4 py-3 text-right">Amort. / mois</th>
            <th className="px-4 py-3 text-right">% / mois</th>
            <th className="px-4 py-3 text-right">Mois écoulés</th>
            <th className="px-4 py-3">Dépréciation</th>
            <th className="px-4 py-3 text-right">Valeur actuelle</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        }>
          {assets.map(a => (
            <tr key={a.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{a.name}</td>
              <td className="px-4 py-3 text-right">{fmtMoney(a.valeur_initiale)} MAD</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">{a.duree_annees} ans</td>
              <td className="px-4 py-3 text-right font-medium text-orange-600 whitespace-nowrap">
                -{fmtMoney(a.amort_mensuel)} MAD
              </td>
              <td className="px-4 py-3 text-right text-orange-500">{a.pct_mensuel} %</td>
              <td className="px-4 py-3 text-right text-gray-500">
                {a.mois_ecoules} / {a.total_mois}
              </td>
              <td className="px-4 py-3">
                {(() => {
                  const restant = Math.max(0, parseFloat((100 - a.pct_perdu).toFixed(1)))
                  return (
                    <div className="flex items-center gap-2 w-36">
                      <ProgressBar pct={restant} />
                      <span className="text-xs text-gray-500 w-10 text-right">{restant}%</span>
                    </div>
                  )
                })()}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                {fmtMoney(a.valeur_actuelle)} MAD
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button onClick={() => setModal({ asset: a })}
                  className="text-blue-500 hover:underline mr-3 text-sm">Modifier</button>
                <button onClick={() => remove(a)}
                  className="text-red-400 hover:underline text-sm">Suppr.</button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {modal && (
        <AssetModal
          asset={modal.asset}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
