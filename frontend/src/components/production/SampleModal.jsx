import { useCallback, useEffect, useRef, useState } from 'react'
import { createSample, updateSample } from '../../api/client'
import { Button, Dialog, Flex, Input, NativeSelect, Textarea } from '@chakra-ui/react'

const CLIENT_OPTIONS = ['Aptiv', 'Yazaki', 'Lear', 'Renault', 'Stellantis', 'Sumitomo', 'Other']
const STATUS_OPTIONS = [
  { value: 'pending',  label: 'En attente' },
  { value: 'approved', label: 'Approuvé' },
  { value: 'rejected', label: 'Rejeté' },
  { value: 'archived', label: 'Archivé' },
]
const FILL_OPTIONS = [
  { value: 'empty',   label: 'Vide',    desc: 'Aucune broche',        color: 'border-slate-300 text-slate-600 bg-white',      active: 'border-slate-600 bg-slate-100 text-slate-800' },
  { value: 'partial', label: 'Partiel', desc: 'Broches partielles',   color: 'border-orange-200 text-orange-600 bg-white',    active: 'border-orange-500 bg-orange-50 text-orange-700' },
  { value: 'full',    label: 'Complet', desc: 'Toutes broches',       color: 'border-blue-200 text-blue-600 bg-white',        active: 'border-blue-600 bg-blue-50 text-blue-700' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function SampleModal({ sample, onClose, onSaved }) {
  const isEdit = !!sample
  const [form, setForm] = useState({
    apn: sample?.apn ?? '',
    project: sample?.project ?? '',
    placement: sample?.placement ?? '',
    client: sample?.client ?? 'Aptiv',
    status: sample?.status ?? 'pending',
    quantity: sample?.quantity ?? 1,
    connector_fill: sample?.connector_fill ?? 'empty',
    received_date: sample?.received_date ?? today(),
    description: sample?.description ?? '',
    commentaire: sample?.commentaire ?? '',
    serial_number: sample?.serial_number != null ? String(sample.serial_number) : '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState(sample?.imageUrl ?? null)
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const dropRef = useRef()

  const handleImageDrop = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }, [])

  function handleDragOver(e) { e.preventDefault(); setDragging(true) }
  function handleDragLeave() { setDragging(false) }
  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleImageDrop(e.dataTransfer.files[0])
  }

  function validate() {
    const errs = {}
    if (!form.apn.trim()) errs.apn = 'Champ obligatoire.'
    if (!form.project.trim()) errs.project = 'Champ obligatoire.'
    if (!form.placement.trim()) {
      errs.placement = 'Champ obligatoire.'
    } else if (!/^[A-Z][0-9]{1,2}$/.test(form.placement)) {
      errs.placement = 'Format invalide. Exemple: A1, B6, C12'
    }
    if (!form.client) errs.client = 'Champ obligatoire.'
    if (!form.received_date) errs.received_date = 'Champ obligatoire.'
    const qty = Number(form.quantity)
    if (!Number.isInteger(qty) || qty < 1) errs.quantity = 'Quantité minimale: 1.'
    if (form.serial_number !== '') {
      const sn = Number(form.serial_number)
      if (!Number.isInteger(sn) || sn < 1) errs.serial_number = 'Doit être un entier positif.'
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'serial_number' && v === '') return
        fd.append(k, v)
      })
      if (imageFile) fd.append('image', imageFile)

      if (isEdit) {
        await updateSample(sample.id, fd)
      } else {
        await createSample(fd)
      }
      onSaved()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        setErrors(data)
      } else {
        setErrors({ __all__: 'Une erreur est survenue.' })
      }
    } finally {
      setSaving(false)
    }
  }

  function field(name, label, type = 'text', hint = null) {
    return (
      <div>
        <label className="label">{label}</label>
        <Input
          type={type}
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          invalid={!!errors[name]}
        />
        {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
        {errors[name] && <p className="text-xs text-red-600 mt-1">{errors[name]}</p>}
      </div>
    )
  }

  return (
    <Dialog.Root open={true} onOpenChange={({ open }) => !open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mx={4} maxW="2xl" maxH="90vh" display="flex" flexDirection="column">
          <Dialog.Header borderBottomWidth="1px" borderColor="gray.100">
            <Flex align="center" justify="space-between">
              <Dialog.Title fontWeight="semibold" color="gray.800" fontSize="lg">
                {isEdit ? "Modifier l'échantillon" : 'Nouvel échantillon'}
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Flex>
          </Dialog.Header>

          <Dialog.Body overflowY="auto" flex={1}>
            <form id="sample-form" onSubmit={handleSubmit} className="space-y-5 py-2">
              {errors.__all__ && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {errors.__all__}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {field('apn', 'APN (Référence article)')}
                {field('project', 'Projet')}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="label">Placement</label>
                  <Input
                    type="text"
                    value={form.placement}
                    onChange={(e) => setForm({ ...form, placement: e.target.value.toUpperCase() })}
                    placeholder="ex: A1, B6"
                    maxLength={3}
                    fontFamily="mono"
                    invalid={!!errors.placement}
                  />
                  <p className="text-xs text-slate-400 mt-1">Lettre + 1-2 chiffres (ex: A1, C12)</p>
                  {errors.placement && <p className="text-xs text-red-600 mt-1">{errors.placement}</p>}
                </div>

                <div>
                  <label className="label">Client</label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={form.client}
                      onChange={(e) => setForm({ ...form, client: e.target.value })}
                    >
                      {CLIENT_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c === 'Other' ? 'Autre' : c}</option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                  {errors.client && <p className="text-xs text-red-600 mt-1">{errors.client}</p>}
                </div>

                <div>
                  <label className="label">Statut</label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="label">Quantité</label>
                  <Input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    invalid={!!errors.quantity}
                  />
                  {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
                </div>

                <div>
                  <label className="label">N° Série</label>
                  <Input
                    type="number"
                    min={1}
                    value={form.serial_number}
                    onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                    placeholder="Auto"
                    fontFamily="mono"
                    invalid={!!errors.serial_number}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {form.serial_number === '' ? 'Vide = généré automatiquement' : `Numéro : ${form.serial_number}`}
                  </p>
                  {errors.serial_number && <p className="text-xs text-red-600 mt-1">{errors.serial_number}</p>}
                </div>
              </div>

              {/* Connector fill */}
              <div>
                <label className="label">État du connecteur</label>
                <div className="flex gap-2 mt-1">
                  {FILL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, connector_fill: opt.value })}
                      className={`flex-1 border-2 rounded-lg py-2 px-1 text-center transition-all ${
                        form.connector_fill === opt.value ? opt.active : opt.color
                      }`}
                    >
                      <p className="text-xs font-semibold">{opt.label}</p>
                      <p className="text-xs opacity-70 leading-tight mt-0.5 hidden sm:block">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {field('received_date', 'Date de réception', 'date')}

              <div>
                <label className="label">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  resize="none"
                  placeholder="Notes, observations…"
                />
              </div>

              <div>
                <label className="label">Commentaire</label>
                <Textarea
                  value={form.commentaire}
                  onChange={(e) => setForm({ ...form, commentaire: e.target.value })}
                  rows={3}
                  resize="none"
                  placeholder="Commentaire libre (rempli depuis « Description / Comments » à l'import Excel)…"
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="label">Photo</label>
                <div
                  ref={dropRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('img-upload')?.click()}
                  className={`border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                    dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                  }`}
                >
                  <input
                    id="img-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageDrop(e.target.files[0])}
                  />
                  {preview ? (
                    <div className="p-3 flex items-center gap-4">
                      <img src={preview} alt="preview" className="w-20 h-20 object-cover rounded-lg" />
                      <div>
                        <p className="text-sm text-slate-600 font-medium">{imageFile?.name ?? 'Image actuelle'}</p>
                        <p className="text-xs text-slate-400 mt-1">Cliquez ou glissez pour remplacer</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-slate-500">Glissez une image ici</p>
                      <p className="text-xs text-slate-400 mt-1">ou cliquez pour parcourir</p>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </Dialog.Body>

          <Dialog.Footer borderTopWidth="1px" borderColor="gray.100" gap={3}>
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button
              colorPalette="blue"
              form="sample-form"
              type="submit"
              disabled={saving}
              loading={saving}
              loadingText="Enregistrement…"
            >
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
