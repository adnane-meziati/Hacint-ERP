import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  approveLogisticsWarehouseTransfer,
  createLogisticsDeliveryOrder,
  createLogisticsDriver,
  createLogisticsShipment,
  createLogisticsTask,
  createLogisticsTaskAttachment,
  createLogisticsTaskComment,
  createLogisticsVehicle,
  createLogisticsWarehouseTransfer,
  createLogisticsReport,
  deleteLogisticsDeliveryOrder,
  deleteLogisticsDriver,
  deleteLogisticsShipment,
  deleteLogisticsTask,
  deleteLogisticsTaskAttachment,
  deleteLogisticsTaskComment,
  deleteLogisticsVehicle,
  deleteLogisticsWarehouseTransfer,
  deleteLogisticsReport,
  exportLogisticsDeliveryOrdersExcelUrl,
  exportLogisticsDriversExcelUrl,
  exportLogisticsEmployeePerformanceCsvUrl,
  exportLogisticsEmployeePerformanceExcelUrl,
  exportLogisticsEmployeePerformancePdfUrl,
  exportLogisticsLateTasksCsvUrl,
  exportLogisticsLateTasksExcelUrl,
  exportLogisticsLateTasksPdfUrl,
  exportLogisticsTasksCsvUrl,
  exportLogisticsTasksExcelUrl,
  exportLogisticsTasksPdfUrl,
  exportLogisticsWorkloadCsvUrl,
  exportLogisticsWorkloadExcelUrl,
  exportLogisticsWorkloadPdfUrl,
  exportLogisticsReportJournalExcelUrl,
  exportLogisticsShipmentsExcelUrl,
  exportLogisticsTransfersExcelUrl,
  exportLogisticsVehiclesExcelUrl,
  getEmployees,
  getEntrepots,
  getLogisticsDashboard,
  getLogisticsDeliveryOrders,
  getLogisticsDrivers,
  getLogisticsEmployeePerformance,
  getLogisticsLateTasks,
  getLogisticsNotifications,
  getLogisticsReportJournal,
  getLogisticsShipments,
  getLogisticsTask,
  getLogisticsTaskAttachments,
  getLogisticsTaskComments,
  getLogisticsTaskHistory,
  getLogisticsTasks,
  getLogisticsVehicles,
  getLogisticsWarehouseTransfers,
  getLogisticsWorkload,
  importLogisticsTasksCsv,
  markAllLogisticsNotificationsRead,
  markLogisticsNotificationRead,
  rejectLogisticsWarehouseTransfer,
  transitLogisticsWarehouseTransfer,
  receiveLogisticsWarehouseTransfer,
  updateLogisticsDeliveryOrder,
  updateLogisticsDriver,
  updateLogisticsShipment,
  updateLogisticsTask,
  updateLogisticsVehicle,
  updateLogisticsWarehouseTransfer,
} from '../../api/client'

const TABS = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'delivery-orders', label: 'Ordres de livraison' },
  { id: 'shipments', label: 'Expéditions' },
  { id: 'vehicles', label: 'Véhicules' },
  { id: 'drivers', label: 'Chauffeurs' },
  { id: 'transfers', label: 'Transferts' },
  { id: 'tasks', label: 'Tâches' },
  { id: 'reports', label: 'Rapports' },
  { id: 'notifications', label: 'Notifications' },
]

const APP_TAB_TO_VIEW = {
  'tableau-de-bord': 'dashboard',
  livraisons: 'delivery-orders',
  expeditions: 'shipments',
  vehicules: 'vehicles',
  chauffeurs: 'drivers',
  transferts: 'transfers',
  taches: 'tasks',
  rapports: 'reports',
  notifications: 'notifications',
}

const VIEW_TO_APP_TAB = Object.fromEntries(
  Object.entries(APP_TAB_TO_VIEW).map(([appTab, view]) => [view, appTab]),
)

const TASK_PRIORITIES = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
  { value: 'critical', label: 'Critique' },
]

const TASK_STATUSES = [
  { value: 'todo', label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'waiting', label: 'En attente' },
  { value: 'done', label: 'Terminée' },
  { value: 'cancelled', label: 'Annulée' },
]

const TASK_ROLES = [
  { value: 'driver', label: 'Chauffeur' },
  { value: 'warehouse_worker', label: 'Magasinier' },
  { value: 'logistics_manager', label: 'Responsable Logistique' },
  { value: 'order_preparer', label: 'Préparateur de Commande' },
  { value: 'shipment_coordinator', label: "Coordinateur d'Expédition" },
  { value: 'quality_controller', label: 'Contrôleur Qualit?' },
  { value: 'other', label: 'Autre' },
]

const SHIPMENT_STATUSES = [
  { value: 'pending', label: 'En attente' },
  { value: 'preparation', label: 'Préparation' },
  { value: 'shipped', label: 'Expédiée' },
  { value: 'in_delivery', label: 'En cours de livraison' },
  { value: 'delivered', label: 'Livrée' },
  { value: 'returned', label: 'Retournée' },
  { value: 'cancelled', label: 'Annulée' },
]

const DELIVERY_STATUSES = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'pending', label: 'En attente' },
  { value: 'preparation', label: 'En préparation' },
  { value: 'ready', label: 'Prêt' },
  { value: 'shipped', label: 'Expédié' },
  { value: 'delivered', label: 'Livré' },
  { value: 'cancelled', label: 'Annulé' },
]

const VEHICLE_STATUSES = [
  { value: 'available', label: 'Disponible' },
  { value: 'assigned', label: 'Affecté' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inactive', label: 'Inactif' },
]

const DRIVER_STATUSES = [
  { value: 'available', label: 'Disponible' },
  { value: 'assigned', label: 'Affecté' },
  { value: 'on_leave', label: 'En congé' },
  { value: 'inactive', label: 'Inactif' },
]

const TRANSFER_STATUSES = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'pending_approval', label: "En attente d'approbation" },
  { value: 'approved', label: 'Approuvé' },
  { value: 'rejected', label: 'Refusé' },
  { value: 'in_transit', label: 'En transit' },
  { value: 'received', label: 'Reçu' },
  { value: 'cancelled', label: 'Annulé' },
]

const EMPTY_TASK = {
  title: '',
  description: '',
  priority: 'medium',
  due_date: '',
  status: 'todo',
  assigned_employees: [],
  vehicle: '',
}

const EMPTY_VEHICLE = {
  registration: '',
  vehicle_type: '',
  capacity: '',
  status: 'available',
  service_date: '',
  notes: '',
}

const EMPTY_DRIVER = {
  employee: '',
  license_number: '',
  license_expiry_date: '',
  status: 'available',
}

const EMPTY_DELIVERY_ORDER = {
  delivery_number: '',
  delivery_date: new Date().toISOString().slice(0, 10),
  customer: '',
  delivery_address: '',
  status: 'draft',
  notes: '',
}

const EMPTY_SHIPMENT = {
  tracking_number: '',
  delivery_order: '',
  vehicle: '',
  driver: '',
  shipment_date: new Date().toISOString().slice(0, 10),
  status: 'pending',
  notes: '',
}

const EMPTY_TRANSFER = {
  transfer_number: '',
  source_warehouse: '',
  destination_warehouse: '',
  destination_type: 'warehouse',
  external_destination: '',
  external_client: '',
  external_site: '',
  external_agency: '',
  external_address: '',
  transport_type: 'own_vehicle',
  vehicle: '',
  driver: '',
  service_company: '',
  service_name: '',
  service_contact: '',
  service_phone: '',
  service_reference: '',
  service_details: '',
  requested_date: new Date().toISOString().slice(0, 10),
  status: 'draft',
  notes: '',
}

function listData(value) {
  return Array.isArray(value) ?value : value?.results || []
}

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value || '—'
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR').format(
    new Date(`${String(value).slice(0, 10)}T00:00:00`),
  )
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getErrorMessage(error) {
  const data = error?.response?.data

  if (typeof data === 'string') {
    if (data.trim().startsWith('<!DOCTYPE') || data.includes('<html')) {
      return 'Le serveur a rencontré une erreur. Veuillez réessayer.'
    }
    return data
  }
  if (data?.detail) return data.detail
  if (data?.error) return data.error

  if (data && typeof data === 'object') {
    const first = Object.entries(data)[0]
    if (first) {
      const value = Array.isArray(first[1]) ?first[1][0] : first[1]
      return `${first[0]} : ${value}`
    }
  }

  return "Une erreur est survenue. Veuillez réessayer."
}

function statusClass(value) {
  const styles = {
    available: 'bg-emerald-100 text-emerald-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    received: 'bg-emerald-100 text-emerald-700',
    approved: 'bg-emerald-100 text-emerald-700',
    done: 'bg-emerald-100 text-emerald-700',
    confirmed: 'bg-blue-100 text-blue-700',
    shipped: 'bg-blue-100 text-blue-700',
    in_delivery: 'bg-blue-100 text-blue-700',
    in_transit: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-blue-100 text-blue-700',
    assigned: 'bg-blue-100 text-blue-700',
    preparation: 'bg-amber-100 text-amber-700',
    preparing: 'bg-amber-100 text-amber-700',
    pending: 'bg-amber-100 text-amber-700',
    waiting: 'bg-amber-100 text-amber-700',
    todo: 'bg-slate-100 text-slate-700',
    draft: 'bg-slate-100 text-slate-600',
    maintenance: 'bg-orange-100 text-orange-700',
    returned: 'bg-orange-100 text-orange-700',
    on_leave: 'bg-orange-100 text-orange-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-red-100 text-red-700',
    unavailable: 'bg-red-100 text-red-700',
    inactive: 'bg-red-100 text-red-700',
  }

  return styles[value] || 'bg-slate-100 text-slate-600'
}

function priorityClass(value) {
  const styles = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  }

  return styles[value] || styles.medium
}

function Badge({ value, label, priority = false }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${
        priority ?priorityClass(value) : statusClass(value)
      }`}
    >
      {label || value || '—'}
    </span>
  )
}

function FieldError({ children }) {
  if (!children) return null
  return <p className="mt-1 text-xs text-red-600">{children}</p>
}

function Modal({ title, onClose, children, width = 'max-w-3xl', inline = false }) {
  if (inline) {
    return (
      <section className="mb-5 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        </div>
        {children}
      </section>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div
        className={`flex max-h-[94vh] w-full flex-col rounded-t-lg bg-white shadow-xl sm:rounded-lg ${width}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            title="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-md text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function ConfirmDialog({ title, message, onCancel, onConfirm, busy }) {
  return (
    <Modal title={title} onClose={onCancel} width="max-w-md">
      <div className="p-5">
        <p className="text-sm leading-6 text-slate-600">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-secondary"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ?'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="border-y border-slate-200 bg-white px-6 py-14 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
      Chargement…
    </div>
  )
}

function ErrorBanner({ message, onClose }) {
  if (!message) return null

  return (
    <div className="mb-4 flex items-start justify-between gap-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="text-lg leading-none text-red-500 hover:text-red-700"
      >
        ×
      </button>
    </div>
  )
}

function StatBlock({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'border-blue-500 text-blue-700',
    green: 'border-emerald-500 text-emerald-700',
    amber: 'border-amber-500 text-amber-700',
    red: 'border-red-500 text-red-700',
    slate: 'border-slate-400 text-slate-700',
  }

  return (
    <div className={`border-l-4 bg-white px-5 py-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value ? value : 0}</p>
    </div>
  )
}

function FormActions({
  onCancel,
  saving,
  submitLabel = 'Enregistrer',
  hideCancel = false,
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
      {!hideCancel && (
        <button type="button" onClick={onCancel} className="btn-secondary">
          Annuler
        </button>
      )}

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ?'Enregistrement…' : submitLabel}
      </button>
    </div>
  )
}

function TableShell({ children }) {
  return (
    <div className="overflow-x-auto border-y border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        {children}
      </table>
    </div>
  )
}

function TableHead({ children }) {
  return (
    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
      <tr>{children}</tr>
    </thead>
  )
}

function Th({ children, className = '' }) {
  return (
    <th className={`whitespace-nowrap px-4 py-3 ${className}`}>
      {children}
    </th>
  )
}

function Td({ children, className = '' }) {
  return (
    <td className={`px-4 py-3 align-middle text-slate-600 ${className}`}>
      {children}
    </td>
  )
}

function RowActions({ onView, onEdit, onDelete }) {
  return (
    <div className="flex justify-end gap-1">
      {onView && (
        <button
          type="button"
          onClick={onView}
          title="Consulter"
          className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
        >
          Détails
        </button>
      )}

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          title="Modifier"
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Modifier
        </button>
      )}

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="Supprimer"
          className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Supprimer
        </button>
      )}
    </div>
  )
}
function TaskFormModal({
  task,
  employees,
  vehicles = [],
  drivers = [],
  tasks = [],
  onClose,
  onSaved,
  inline = false,
}) {
  const isEdit = Boolean(task)
  const [form, setForm] = useState({
    ...EMPTY_TASK,
    ...(task || {}),
    assigned_employees:
      task?.assigned_employees?.map((employee) =>
        typeof employee === 'object' ?String(employee.id) : String(employee)
      ) ||
      task?.assigned_employee_details?.map((employee) => String(employee.id)) ||
      [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const groupedEmployees = useMemo(() => {
    const groups = {}
    const busyEmployeeIds = new Set(
      tasks
        .filter(
          (item) =>
            ['todo', 'in_progress', 'waiting'].includes(item.status) &&
            item.id !== task?.id,
        )
        .flatMap((item) => item.assigned_employees || [])
        .map((item) => String(typeof item === 'object' ? item.id : item)),
    )
    const busyDriverEmployeeIds = new Set(
      drivers
        .filter((driver) => driver.status !== 'available')
        .map((driver) => String(driver.employee)),
    )

    employees.forEach((employee) => {
      const department = employee.department_name || 'Sans département'
      if (!groups[department]) groups[department] = []
      groups[department].push({
        ...employee,
        unavailable:
          busyEmployeeIds.has(String(employee.id)) ||
          busyDriverEmployeeIds.has(String(employee.id)),
      })
    })

    Object.values(groups).forEach((items) => {
      items.sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(
          `${b.last_name} ${b.first_name}`,
          'fr',
        ),
      )
    })

    return Object.entries(groups).sort(([a], [b]) =>
      a.localeCompare(b, 'fr'),
    )
  }, [drivers, employees, task, tasks])

  function set(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function toggleEmployee(id) {
    const value = String(id)

    setForm((current) => ({
      ...current,
      assigned_employees: current.assigned_employees.includes(value)
        ?current.assigned_employees.filter((item) => item !== value)
        : [...current.assigned_employees, value],
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.title.trim()) {
      setError('Le titre de la tâche est obligatoire.')
      return
    }

    if (!form.due_date) {
      setError("La date d'échéance est obligatoire.")
      return
    }

    if (!form.assigned_employees.length) {
      setError('Sélectionnez au moins un employé.')
      return
    }

    const payload = {
      title: form.title.trim(),
      description: form.description || '',
      priority: form.priority,
      due_date: form.due_date,
      status: form.status,
      assigned_employees: form.assigned_employees.map(Number),
      vehicle: form.vehicle ? Number(form.vehicle) : null,
    }

    setSaving(true)

    try {
      if (isEdit) {
        await updateLogisticsTask(task.id, payload)
      } else {
        await createLogisticsTask(payload)
      }

      await onSaved()
      onClose()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ?'Modifier la tâche' : 'Nouvelle tâche logistique'}
      onClose={onClose}
      width="max-w-4xl"
      inline={inline}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-5 p-5">
          <ErrorBanner message={error} onClose={() => setError('')} />

          <div>
            <label className="label">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={(event) => set('title', event.target.value)}
              className="input"
              placeholder="Ex. Préparer la commande du client"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={(event) => set('description', event.target.value)}
              rows={4}
              className="input resize-none"
              placeholder="Détails et instructions concernant la tâche"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Priorité</label>
              <select
                value={form.priority}
                onChange={(event) => set('priority', event.target.value)}
                className="input"
              >
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                Date d'échéance <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(event) => set('due_date', event.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Statut</label>
              <select
                value={form.status}
                onChange={(event) => set('status', event.target.value)}
                className="input"
              >
                {TASK_STATUSES.map((taskStatus) => (
                  <option key={taskStatus.value} value={taskStatus.value}>
                    {taskStatus.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Véhicule</label>
            <select
              value={form.vehicle || ''}
              onChange={(event) => set('vehicle', event.target.value)}
              className="input"
            >
              <option value="">Aucun véhicule</option>
              {vehicles.map((vehicle) => {
                const current =
                  String(vehicle.id) === String(task?.vehicle)
                const unavailable =
                  vehicle.status !== 'available' && !current
                return (
                  <option
                    key={vehicle.id}
                    value={vehicle.id}
                    disabled={unavailable}
                  >
                    {vehicle.registration} · {vehicle.vehicle_type}
                    {unavailable ? ' · Indisponible' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">
                Employés assignés <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-slate-400">
                {form.assigned_employees.length} sélectionné(s)
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-200">
              {groupedEmployees.length === 0 ?(
                <p className="p-4 text-sm text-slate-500">
                  Aucun employé disponible.
                </p>
              ) : (
                groupedEmployees.map(([department, departmentEmployees]) => (
                  <div key={department}>
                    <div className="sticky top-0 border-y border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
                      {department}
                    </div>

                    <div className="divide-y divide-slate-100">
                      {departmentEmployees.map((employee) => {
                        const employeeId = String(employee.id)
                        const checked =
                          form.assigned_employees.includes(employeeId)
                        const unavailable = employee.unavailable && !checked

                        return (
                          <label
                            key={employee.id}
                            className={`flex items-center gap-3 px-4 py-3 ${
                              unavailable
                                ? 'cursor-not-allowed bg-slate-50 opacity-60'
                                : 'cursor-pointer hover:bg-blue-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={unavailable}
                              onChange={() => toggleEmployee(employee.id)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />

                            <span className="min-w-0 flex-1">
                              <span className="block font-medium text-slate-700">
                                {employee.first_name} {employee.last_name}
                              </span>
                              <span className="block text-xs text-slate-400">
                                {employee.employee_number} · {department}
                              </span>
                            </span>

                            {employee.position && (
                              <span className="hidden text-xs text-slate-400 sm:block">
                                {employee.position}
                              </span>
                            )}
                            {unavailable && (
                              <span className="text-xs font-semibold text-red-600">
                                Indisponible
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <FormActions
          onCancel={onClose}
          saving={saving}
          submitLabel={isEdit ?'Enregistrer' : 'Créer la tâche'}
          hideCancel={inline}
        />
      </form>
    </Modal>
  )
}

function TaskDetailsModal({ taskId, onClose, onChanged }) {
  const [task, setTask] = useState(null)
  const [comments, setComments] = useState([])
  const [attachments, setAttachments] = useState([])
  const [history, setHistory] = useState([])
  const [comment, setComment] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [commentSaving, setCommentSaving] = useState(false)
  const [fileSaving, setFileSaving] = useState(false)
  const [error, setError] = useState('')

  const loadDetails = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [
        taskResponse,
        commentsResponse,
        attachmentsResponse,
        historyResponse,
      ] = await Promise.all([
        getLogisticsTask(taskId),
        getLogisticsTaskComments({ task: taskId }),
        getLogisticsTaskAttachments({ task: taskId }),
        getLogisticsTaskHistory({ task: taskId }),
      ])

      setTask(taskResponse)
      setComments(listData(commentsResponse))
      setAttachments(listData(attachmentsResponse))
      setHistory(listData(historyResponse))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    loadDetails()
  }, [loadDetails])

  async function submitComment(event) {
    event.preventDefault()

    if (!comment.trim()) return

    setCommentSaving(true)
    setError('')

    try {
      await createLogisticsTaskComment({
        task: taskId,
        comment: comment.trim(),
      })

      setComment('')
      await loadDetails()
      await onChanged()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setCommentSaving(false)
    }
  }

  async function removeComment(commentId) {
    if (!window.confirm('Supprimer ce commentaire ?')) return

    try {
      await deleteLogisticsTaskComment(commentId)
      await loadDetails()
      await onChanged()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  async function submitAttachment(event) {
    event.preventDefault()

    if (!file) {
      setError('Sélectionnez un fichier à joindre.')
      return
    }

    const payload = new FormData()
    payload.append('task', taskId)
    payload.append('file', file)

    setFileSaving(true)
    setError('')

    try {
      await createLogisticsTaskAttachment(payload)
      setFile(null)
      event.target.reset()
      await loadDetails()
      await onChanged()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setFileSaving(false)
    }
  }

  async function removeAttachment(attachmentId) {
    if (!window.confirm('Supprimer cette pièce jointe ?')) return

    try {
      await deleteLogisticsTaskAttachment(attachmentId)
      await loadDetails()
      await onChanged()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  return (
    <Modal title="Détails de la tâche" onClose={onClose} width="max-w-5xl">
      {loading ?(
        <LoadingState />
      ) : (
        <div className="space-y-6 p-5">
          <ErrorBanner message={error} onClose={() => setError('')} />

          {task && (
            <>
              <div className="border-b border-slate-200 pb-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-800">
                      {task.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      CrÀe le {formatDateTime(task.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge
                      priority
                      value={task.priority}
                      label={
                        task.priority_display ||
                        optionLabel(TASK_PRIORITIES, task.priority)
                      }
                    />
                    <Badge
                      value={task.status}
                      label={
                        task.status_display ||
                        optionLabel(TASK_STATUSES, task.status)
                      }
                    />
                  </div>
                </div>

                {task.description && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {task.description}
                  </p>
                )}

                <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-400">
                      Échéance
                    </dt>
                    <dd className="mt-1 font-medium text-slate-700">
                      {formatDate(task.due_date)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-400">
                      Dernière modification
                    </dt>
                    <dd className="mt-1 font-medium text-slate-700">
                      {formatDateTime(task.updated_at)}
                    </dd>
                  </div>
                </dl>
              </div>

              <section>
                <h4 className="mb-3 font-semibold text-slate-800">
                  Employés assignés
                </h4>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(task.assigned_employee_details || []).map((employee) => (
                    <div
                      key={employee.id}
                      className="border border-slate-200 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-slate-700">
                        {employee.full_name ||
                          `${employee.first_name} ${employee.last_name}`}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {employee.employee_number} ·{' '}
                        {employee.department_name || 'Sans département'}
                      </p>
                    </div>
                  ))}

                  {!task.assigned_employee_details?.length && (
                    <p className="text-sm text-slate-400">
                      Aucun employé assigné.
                    </p>
                  )}
                </div>
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section>
                  <h4 className="mb-3 font-semibold text-slate-800">
                    Commentaires
                  </h4>

                  <form onSubmit={submitComment} className="mb-4">
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      rows={3}
                      className="input resize-none"
                      placeholder="Ajouter un commentaire"
                    />

                    <div className="mt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={commentSaving || !comment.trim()}
                        className="btn-primary"
                      >
                        {commentSaving ?'Ajout…' : 'Ajouter'}
                      </button>
                    </div>
                  </form>

                  <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto border border-slate-200">
                    {comments.map((item) => (
                      <div key={item.id} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-600">
                              {item.author_name || 'Utilisateur'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatDateTime(item.created_at)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeComment(item.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Supprimer
                          </button>
                        </div>

                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                          {item.comment}
                        </p>
                      </div>
                    ))}

                    {!comments.length && (
                      <p className="p-4 text-sm text-slate-400">
                        Aucun commentaire.
                      </p>
                    )}
                  </div>
                </section>

                <section>
                  <h4 className="mb-3 font-semibold text-slate-800">
                    Pièces jointes
                  </h4>

                  <form onSubmit={submitAttachment} className="mb-4">
                    <input
                      type="file"
                      onChange={(event) =>
                        setFile(event.target.files?.[0] || null)
                      }
                      className="input"
                    />

                    <div className="mt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={fileSaving || !file}
                        className="btn-primary"
                      >
                        {fileSaving ?'Téléversement…' : 'Joindre le fichier'}
                      </button>
                    </div>
                  </form>

                  <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto border border-slate-200">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <div className="min-w-0">
                          <a
                            href={attachment.file_url || attachment.file}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-sm font-medium text-blue-600 hover:underline"
                          >
                            {attachment.file_name ||
                              attachment.file?.split('/').pop() ||
                              'Ouvrir le document'}
                          </a>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {attachment.uploaded_by_name || 'Utilisateur'} ·{' '}
                            {formatDateTime(attachment.uploaded_at)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="shrink-0 text-xs text-red-500 hover:text-red-700"
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}

                    {!attachments.length && (
                      <p className="p-4 text-sm text-slate-400">
                        Aucune pièce jointe.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              <section>
                <h4 className="mb-3 font-semibold text-slate-800">
                  Historique
                </h4>

                <div className="max-h-80 overflow-y-auto border border-slate-200">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="border-b border-slate-100 px-4 py-3 last:border-b-0"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-700">
                          {item.action_display || item.action}
                        </p>
                        <time className="text-xs text-slate-400">
                          {formatDateTime(item.created_at)}
                        </time>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        Par {item.actor_name || 'Système'}
                      </p>

                      {(item.old_value || item.new_value) && (
                        <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                          <div className="bg-red-50 px-3 py-2 text-red-700">
                            <span className="font-semibold">Avant :</span>{' '}
                            {item.old_value || '—'}
                          </div>
                          <div className="bg-emerald-50 px-3 py-2 text-emerald-700">
                            <span className="font-semibold">Après :</span>{' '}
                            {item.new_value || '—'}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {!history.length && (
                    <p className="p-4 text-sm text-slate-400">
                      Aucun historique disponible.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      <div className="flex justify-end border-t border-slate-200 px-5 py-4">
        <button type="button" onClick={onClose} className="btn-secondary">
          Fermer
        </button>
      </div>
    </Modal>
  )
}
function VehicleFormModal({ vehicle, onClose, onSaved, inline = false }) {
  const isEdit = Boolean(vehicle)
  const [form, setForm] = useState({ ...EMPTY_VEHICLE, ...(vehicle || {}) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        ...form,
        capacity: form.capacity || null,
        service_date: form.service_date || null,
      }

      if (isEdit) await updateLogisticsVehicle(vehicle.id, payload)
      else await createLogisticsVehicle(payload)

      await onSaved()
      onClose()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ?'Modifier le véhicule' : 'Nouveau véhicule'}
      onClose={onClose}
      width="max-w-2xl"
      inline={inline}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          <ErrorBanner message={error} onClose={() => setError('')} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">
                Immatriculation <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.registration}
                onChange={(event) =>
                  set('registration', event.target.value)
                }
                className="input"
              />
            </div>

            <div>
              <label className="label">
                Type de véhicule <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.vehicle_type}
                onChange={(event) => set('vehicle_type', event.target.value)}
                className="input"
                placeholder="Camion, fourgon…"
              />
            </div>

            <div>
              <label className="label">Capacité (kg)</label>
              <div className="flex">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.capacity}
                  onChange={(event) => set('capacity', event.target.value)}
                  className="input rounded-r-none"
                  placeholder="Capacité de chargement"
                />
                <span className="flex items-center border border-l-0 border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-500">
                  kg
                </span>
              </div>
            </div>

            <div>
              <label className="label">Date de mise en service</label>
              <input
                type="date"
                value={form.service_date || ''}
                onChange={(event) => set('service_date', event.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Statut</label>
              <select
                value={form.status}
                onChange={(event) => set('status', event.target.value)}
                className="input"
              >
                {VEHICLE_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        <FormActions
          onCancel={onClose}
          saving={saving}
          submitLabel={isEdit ?'Enregistrer' : 'Créer'}
          hideCancel={inline}
        />
      </form>
    </Modal>
  )
}

function DriverFormModal({ driver, employees, onClose, onSaved, inline = false }) {
  const isEdit = Boolean(driver)
  const [form, setForm] = useState({ ...EMPTY_DRIVER, ...(driver || {}) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const transportEmployees = useMemo(
    () =>
      employees
        .filter(
          (employee) =>
            employee.department_name?.trim().toLowerCase() ===
            'transport services',
        )
        .sort((a, b) =>
          `${a.last_name} ${a.first_name}`.localeCompare(
            `${b.last_name} ${b.first_name}`,
            'fr',
          ),
        ),
    [employees],
  )

  function set(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        employee: Number(form.employee),
        license_number: form.license_number.trim(),
        license_expiry_date: form.license_expiry_date || null,
        status: form.status,
      }

      if (isEdit) await updateLogisticsDriver(driver.id, payload)
      else await createLogisticsDriver(payload)

      await onSaved()
      onClose()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ?'Modifier le chauffeur' : 'Nouveau chauffeur'}
      onClose={onClose}
      width="max-w-2xl"
      inline={inline}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          <ErrorBanner message={error} onClose={() => setError('')} />

          <div>
            <label className="label">
              Employé du département Transport Services{' '}
              <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.employee}
              onChange={(event) => set('employee', event.target.value)}
              className="input"
            >
              <option value="">Sélectionner un employé</option>
              {transportEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name} (
                  {employee.employee_number})
                </option>
              ))}
            </select>

            {!transportEmployees.length && (
              <FieldError>
                Aucun employé n'existe dans le département Transport Services.
              </FieldError>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">
                Numéro de permis <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.license_number}
                onChange={(event) =>
                  set('license_number', event.target.value)
                }
                className="input"
              />
            </div>

            <div>
              <label className="label">Expiration du permis</label>
              <input
                type="date"
                value={form.license_expiry_date || ''}
                onChange={(event) =>
                  set('license_expiry_date', event.target.value)
                }
                className="input"
              />
            </div>

            <div>
              <label className="label">Statut</label>
              <select
                value={form.status}
                onChange={(event) => set('status', event.target.value)}
                className="input"
              >
                {DRIVER_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <FormActions
          onCancel={onClose}
          saving={saving}
          submitLabel={isEdit ?'Enregistrer' : 'Créer'}
          hideCancel={inline}
        />
      </form>
    </Modal>
  )
}

function DeliveryOrderFormModal({ order, onClose, onSaved, inline = false }) {
  const isEdit = Boolean(order)
  const [form, setForm] = useState({
    ...EMPTY_DELIVERY_ORDER,
    ...(order || {}),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        delivery_number: form.delivery_number.trim(),
        delivery_date: form.delivery_date,
        customer: form.customer.trim(),
        delivery_address: form.delivery_address.trim(),
        status: form.status,
        notes: form.notes || '',
      }

      if (isEdit) {
        await updateLogisticsDeliveryOrder(order.id, payload)
      } else {
        await createLogisticsDeliveryOrder(payload)
      }

      await onSaved()
      onClose()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={
        isEdit ?"Modifier l'ordre de livraison" : 'Nouvel ordre de livraison'
      }
      onClose={onClose}
      width="max-w-3xl"
      inline={inline}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          <ErrorBanner message={error} onClose={() => setError('')} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">
                Numéro de livraison <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.delivery_number}
                onChange={(event) =>
                  set('delivery_number', event.target.value)
                }
                className="input"
              />
            </div>

            <div>
              <label className="label">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="date"
                value={form.delivery_date}
                onChange={(event) => set('delivery_date', event.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">
                Client <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.customer}
                onChange={(event) => set('customer', event.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Statut</label>
              <select
                value={form.status}
                onChange={(event) => set('status', event.target.value)}
                className="input"
              >
                {DELIVERY_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">
              Adresse de livraison <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={form.delivery_address}
              onChange={(event) =>
                set('delivery_address', event.target.value)
              }
              className="input resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Produits concernés</label>
              <textarea
                rows={4}
                value={form.products}
                onChange={(event) => set('products', event.target.value)}
                className="input resize-none"
                placeholder="Liste ou description des produits"
              />
            </div>

            <div>
              <label className="label">Quantités</label>
              <textarea
                rows={4}
                value={form.quantities}
                onChange={(event) => set('quantities', event.target.value)}
                className="input resize-none"
                placeholder="Quantités correspondantes"
              />
            </div>
          </div>
        </div>

        <FormActions
          onCancel={onClose}
          saving={saving}
          submitLabel={isEdit ?'Enregistrer' : "Créer l'ordre"}
          hideCancel={inline}
        />
      </form>
    </Modal>
  )
}

function ShipmentFormModal({
  shipment,
  deliveryOrders,
  vehicles,
  drivers,
  onClose,
  onSaved,
  inline = false,
}) {
  const isEdit = Boolean(shipment)
  const [form, setForm] = useState({ ...EMPTY_SHIPMENT, ...(shipment || {}) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        tracking_number: form.tracking_number.trim(),
        delivery_order: Number(form.delivery_order),
        vehicle: form.vehicle ?Number(form.vehicle) : null,
        driver: form.driver ?Number(form.driver) : null,
        shipment_date: form.shipment_date,
        status: form.status,
        notes: form.notes || '',
      }

      if (isEdit) await updateLogisticsShipment(shipment.id, payload)
      else await createLogisticsShipment(payload)

      await onSaved()
      onClose()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ?"Modifier l'expédition" : 'Nouvelle expédition'}
      onClose={onClose}
      width="max-w-3xl"
      inline={inline}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          <ErrorBanner message={error} onClose={() => setError('')} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">
                Numéro de suivi <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.tracking_number}
                onChange={(event) =>
                  set('tracking_number', event.target.value)
                }
                className="input"
              />
            </div>

            <div>
              <label className="label">
                Ordre de livraison <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.delivery_order}
                onChange={(event) =>
                  set('delivery_order', event.target.value)
                }
                className="input"
              >
                <option value="">Sélectionner</option>
                {deliveryOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.delivery_number} · {order.customer}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Véhicule</label>
              <select
                value={form.vehicle || ''}
                onChange={(event) => set('vehicle', event.target.value)}
                className="input"
              >
                <option value="">Non affecté</option>
                {vehicles
                  .filter(
                    (vehicle) =>
                      vehicle.is_active !== false &&
                      ['available', 'assigned'].includes(vehicle.status),
                  )
                  .map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.registration} · {vehicle.vehicle_type}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="label">Chauffeur</label>
              <select
                value={form.driver || ''}
                onChange={(event) => set('driver', event.target.value)}
                className="input"
              >
                <option value="">Non affecté</option>
                {drivers
                  .filter((driver) =>
                    ['available', 'assigned'].includes(driver.status),
                  )
                  .map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.employee_name || driver.employee_full_name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="label">
                Date d'expédition <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="date"
                value={form.shipment_date}
                onChange={(event) =>
                  set('shipment_date', event.target.value)
                }
                className="input"
              />
            </div>

            <div>
              <label className="label">Statut</label>
              <select
                value={form.status}
                onChange={(event) => set('status', event.target.value)}
                className="input"
              >
                {SHIPMENT_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => set('notes', event.target.value)}
              className="input resize-none"
            />
          </div>
        </div>

        <FormActions
          onCancel={onClose}
          saving={saving}
          submitLabel={isEdit ?'Enregistrer' : "Créer l'expédition"}
          hideCancel={inline}
        />
      </form>
    </Modal>
  )
}
function TransferFormModal({
  transfer,
  warehouses,
  vehicles = [],
  drivers = [],
  onClose,
  onSaved,
  inline = false,
}) {
  const isEdit = Boolean(transfer)
  const [form, setForm] = useState({
    ...EMPTY_TRANSFER,
    ...(transfer || {}),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (
      form.destination_type === 'warehouse' &&
      String(form.source_warehouse) === String(form.destination_warehouse)
    ) {
      setError("L'entrepôt source et l'entrepôt destination doivent être différents.")
      return
    }

    const payload = {
      transfer_number: form.transfer_number.trim(),
      requested_date: form.requested_date,
      source_warehouse: Number(form.source_warehouse),
      destination_type: form.destination_type,
      destination_warehouse:
        form.destination_type === 'warehouse'
          ? Number(form.destination_warehouse)
          : null,
      external_destination:
        form.destination_type === 'external'
          ? [
              form.external_client,
              form.external_site,
              form.external_agency,
              form.external_address,
            ].join(' - ')
          : '',
      external_client:
        form.destination_type === 'external'
          ? form.external_client.trim()
          : '',
      external_site:
        form.destination_type === 'external'
          ? form.external_site.trim()
          : '',
      external_agency:
        form.destination_type === 'external'
          ? form.external_agency.trim()
          : '',
      external_address:
        form.destination_type === 'external'
          ? form.external_address.trim()
          : '',
      transport_type: form.transport_type,
      vehicle:
        form.transport_type === 'own_vehicle' && form.vehicle
          ? Number(form.vehicle)
          : null,
      driver:
        form.transport_type === 'own_vehicle' && form.driver
          ? Number(form.driver)
          : null,
      service_company:
        form.transport_type === 'service'
          ? form.service_company.trim()
          : '',
      service_name:
        form.transport_type === 'service' ? form.service_name.trim() : '',
      service_contact:
        form.transport_type === 'service' ? form.service_contact.trim() : '',
      service_phone:
        form.transport_type === 'service' ? form.service_phone.trim() : '',
      service_reference:
        form.transport_type === 'service' ? form.service_reference.trim() : '',
      service_details:
        form.transport_type === 'service'
          ? [
              form.service_name,
              form.service_contact,
              form.service_phone,
              form.service_reference,
            ].join(' - ')
          : '',
      status: form.status,
      notes: form.notes || '',
    }

    setSaving(true)

    try {
      if (isEdit) {
        await updateLogisticsWarehouseTransfer(transfer.id, payload)
      } else {
        await createLogisticsWarehouseTransfer(payload)
      }

      await onSaved()
      onClose()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ?'Modifier le transfert' : 'Nouveau transfert'}
      onClose={onClose}
      width="max-w-3xl"
      inline={inline}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          <ErrorBanner message={error} onClose={() => setError('')} />

          <div>
            <label className="label">
              Numéro de transfert <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.transfer_number}
              onChange={(event) =>
                set('transfer_number', event.target.value)
              }
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">
                Entrepôt source <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.source_warehouse}
                onChange={(event) =>
                  set('source_warehouse', event.target.value)
                }
                className="input"
              >
                <option value="">Sélectionner un entrepôt</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Type de destination</label>
              <select
                value={form.destination_type}
                onChange={(event) =>
                  set('destination_type', event.target.value)
                }
                className="input"
              >
                <option value="warehouse">Entrepôt</option>
                <option value="external">Lieu externe</option>
              </select>
            </div>

            {form.destination_type === 'warehouse' ? (
              <>
                <div>
                  <label className="label">
                    Entrepôt destination <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={form.destination_warehouse}
                    onChange={(event) =>
                      set('destination_warehouse', event.target.value)
                    }
                    className="input"
                  >
                    <option value="">Sélectionner un entrepôt</option>
                    {warehouses
                      .filter(
                        (warehouse) =>
                          String(warehouse.id) !== String(form.source_warehouse),
                      )
                      .map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.nom}
                        </option>
                      ))}
                  </select>
                </div>
                {form.transport_type === 'own_vehicle' && (
                  <div>
                    <label className="label">
                      Chauffeur disponible <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={form.driver || ''}
                      onChange={(event) => set('driver', event.target.value)}
                      className="input"
                    >
                      <option value="">Sélectionner un chauffeur</option>
                      {drivers
                        .filter(
                          (driver) =>
                            driver.status === 'available' ||
                            String(driver.id) === String(transfer?.driver),
                        )
                        .map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.employee_name} · {driver.employee_number}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
                <div>
                  <label className="label">
                    Client <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.external_client}
                    onChange={(event) => set('external_client', event.target.value)}
                    className="input"
                    placeholder="Nom du client"
                  />
                </div>
                <div>
                  <label className="label">
                    Chantier <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.external_site}
                    onChange={(event) => set('external_site', event.target.value)}
                    className="input"
                    placeholder="Nom du chantier"
                  />
                </div>
                <div>
                  <label className="label">
                    Agence <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.external_agency}
                    onChange={(event) => set('external_agency', event.target.value)}
                    className="input"
                    placeholder="Nom de l'agence"
                  />
                </div>
                <div>
                  <label className="label">
                    Adresse <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.external_address}
                    onChange={(event) => set('external_address', event.target.value)}
                    className="input"
                    placeholder="Adresse complète"
                  />
                </div>
                {form.transport_type === 'own_vehicle' && (
                  <div>
                    <label className="label">
                      Chauffeur disponible <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={form.driver || ''}
                      onChange={(event) => set('driver', event.target.value)}
                      className="input"
                    >
                      <option value="">Sélectionner un chauffeur</option>
                      {drivers
                        .filter(
                          (driver) =>
                            driver.status === 'available' ||
                            String(driver.id) === String(transfer?.driver),
                        )
                        .map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.employee_name} · {driver.employee_number}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Moyen de transport</label>
              <select
                value={form.transport_type}
                onChange={(event) => set('transport_type', event.target.value)}
                className="input"
              >
                <option value="own_vehicle">Notre véhicule</option>
                <option value="service">Service externe</option>
              </select>
            </div>

            {form.transport_type === 'own_vehicle' ? (
              <>
                <div>
                  <label className="label">
                    Véhicule disponible <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={form.vehicle || ''}
                    onChange={(event) => set('vehicle', event.target.value)}
                    className="input"
                  >
                    <option value="">Sélectionner un véhicule</option>
                    {vehicles
                      .filter(
                        (vehicle) =>
                          vehicle.status === 'available' ||
                          String(vehicle.id) === String(transfer?.vehicle),
                      )
                      .map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.registration} · {vehicle.vehicle_type}
                        </option>
                      ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label">
                    Société de transport <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.service_company}
                    onChange={(event) => set('service_company', event.target.value)}
                    className="input"
                    placeholder="Nom de la société"
                  />
                </div>
                <div>
                  <label className="label">
                    Service <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.service_name}
                    onChange={(event) => set('service_name', event.target.value)}
                    className="input"
                    placeholder="Nom du service"
                  />
                </div>
                <div>
                  <label className="label">
                    Contact <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.service_contact}
                    onChange={(event) => set('service_contact', event.target.value)}
                    className="input"
                    placeholder="Nom du contact"
                  />
                </div>
                <div>
                  <label className="label">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.service_phone}
                    onChange={(event) => set('service_phone', event.target.value)}
                    className="input"
                    placeholder="Numéro de téléphone"
                  />
                </div>
                <div>
                  <label className="label">
                    Référence <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.service_reference}
                    onChange={(event) => set('service_reference', event.target.value)}
                    className="input"
                    placeholder="Contrat, commande ou référence"
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label className="label">Statut</label>
            <select
              value={form.status}
              onChange={(event) => set('status', event.target.value)}
              className="input"
            >
              {TRANSFER_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => set('notes', event.target.value)}
              className="input resize-none"
            />
          </div>
        </div>

        <FormActions
          onCancel={onClose}
          saving={saving}
          submitLabel={isEdit ?'Enregistrer' : 'Créer le transfert'}
          hideCancel={inline}
        />
      </form>
    </Modal>
  )
}

function DashboardView({ dashboard, loading, onNavigate }) {
  if (loading) return <LoadingState />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatBlock
          label="Expéditions en attente"
          value={dashboard.pending_shipments}
          tone="amber"
        />
        <StatBlock
          label="Expéditions en cours"
          value={dashboard.active_shipments}
          tone="blue"
        />
        <StatBlock
          label="Livraisons aujourd'hui"
          value={dashboard.delivered_today}
          tone="green"
        />
        <StatBlock
          label="Transferts actifs"
          value={dashboard.active_transfers}
          tone="blue"
        />
        <StatBlock
          label="Véhicules disponibles"
          value={dashboard.available_vehicles}
          tone="green"
        />
        <StatBlock
          label="Véhicules indisponibles"
          value={dashboard.unavailable_vehicles}
          tone="red"
        />
        <StatBlock
          label="Tâches actives"
          value={dashboard.active_tasks}
          tone="blue"
        />
        <StatBlock
          label="Tâches en retard"
          value={dashboard.late_tasks}
          tone="red"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <button
          type="button"
          onClick={() => onNavigate('shipments')}
          className="border border-slate-200 bg-white p-5 text-left hover:border-blue-300 hover:bg-blue-50"
        >
          <p className="text-xs font-semibold uppercase text-slate-400">
            Expéditions
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-800">
            Suivre les livraisons
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Consultez les expéditions, véhicules et chauffeurs affectés.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('tasks')}
          className="border border-slate-200 bg-white p-5 text-left hover:border-blue-300 hover:bg-blue-50"
        >
          <p className="text-xs font-semibold uppercase text-slate-400">
            Tâches
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-800">
            {dashboard.pending_tasks || 0} tâche(s) à faire
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Affectez les employés et suivez leur avancement.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('notifications')}
          className="border border-slate-200 bg-white p-5 text-left hover:border-blue-300 hover:bg-blue-50"
        >
          <p className="text-xs font-semibold uppercase text-slate-400">
            Notifications
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-800">
            {dashboard.unread_notifications || 0} non lue(s)
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Affectations, modifications et échéances proches.
          </p>
        </button>
      </div>
    </div>
  )
}

function VehiclesView({
  vehicles,
  loading,
  onCreate,
  onEdit,
  onDelete,
}) {
  if (loading) return <LoadingState />

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <a href={exportLogisticsVehiclesExcelUrl()} className="btn-secondary">
          Export Excel
        </a>
      </div>

      {!vehicles.length ?(
        <EmptyState
          title="Aucun véhicule"
          description="Ajoutez le premier véhicule du parc logistique."
        />
      ) : (
        <TableShell>
          <TableHead>
            <Th>Immatriculation</Th>
            <Th>Type</Th>
            <Th>Capacité</Th>
            <Th>Mise en service</Th>
            <Th>Statut</Th>
            <Th className="text-right">Actions</Th>
          </TableHead>

          <tbody className="divide-y divide-slate-100">
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-slate-50">
                <Td className="font-semibold text-slate-800">
                  {vehicle.registration}
                </Td>
                <Td>{vehicle.vehicle_type}</Td>
                <Td>{vehicle.capacity ? `${vehicle.capacity} kg` : '—'}</Td>
                <Td>{formatDate(vehicle.service_date)}</Td>
                <Td>
                  <Badge
                    value={vehicle.status}
                    label={
                      vehicle.status_display ||
                      optionLabel(VEHICLE_STATUSES, vehicle.status)
                    }
                  />
                </Td>
                <Td>
                  <RowActions
                    onEdit={() => onEdit(vehicle)}
                    onDelete={() => onDelete(vehicle)}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  )
}

function DriversView({
  drivers,
  loading,
  onCreate,
  onEdit,
  onDelete,
}) {
  if (loading) return <LoadingState />

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <a href={exportLogisticsDriversExcelUrl()} className="btn-secondary">
          Export Excel
        </a>
      </div>

      {!drivers.length ?(
        <EmptyState
          title="Aucun chauffeur"
          description="Les chauffeurs doivent appartenir au département Transport Services."
        />
      ) : (
        <TableShell>
          <TableHead>
            <Th>Employé</Th>
            <Th>Département</Th>
            <Th>Permis</Th>
            <Th>Expiration</Th>
            <Th>Statut</Th>
            <Th className="text-right">Actions</Th>
          </TableHead>

          <tbody className="divide-y divide-slate-100">
            {drivers.map((driver) => (
              <tr key={driver.id} className="hover:bg-slate-50">
                <Td className="font-semibold text-slate-800">
                  {driver.employee_name || driver.employee_full_name || '—'}
                </Td>
                <Td>{driver.department_name || 'Transport Services'}</Td>
                <Td>{driver.license_number}</Td>
                <Td>{formatDate(driver.license_expiry_date)}</Td>
                <Td>
                  <Badge
                    value={driver.status}
                    label={
                      driver.status_display ||
                      optionLabel(DRIVER_STATUSES, driver.status)
                    }
                  />
                </Td>
                <Td>
                  <RowActions
                    onEdit={() => onEdit(driver)}
                    onDelete={() => onDelete(driver)}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  )
}
function DeliveryOrdersView({
  orders,
  loading,
  onCreate,
  onEdit,
  onDelete,
}) {
  if (loading) return <LoadingState />

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <a href={exportLogisticsDeliveryOrdersExcelUrl()} className="btn-secondary">
          Export Excel
        </a>
      </div>

      {!orders.length ?(
        <EmptyState
          title="Aucun ordre de livraison"
          description="Créez un ordre pour préparer une livraison client."
        />
      ) : (
        <TableShell>
          <TableHead>
            <Th>Numéro</Th>
            <Th>Date</Th>
            <Th>Client</Th>
            <Th>Adresse</Th>
            <Th>Statut</Th>
            <Th className="text-right">Actions</Th>
          </TableHead>

          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50">
                <Td className="font-semibold text-slate-800">
                  {order.delivery_number}
                </Td>
                <Td>{formatDate(order.delivery_date)}</Td>
                <Td>{order.customer}</Td>
                <Td className="max-w-xs">
                  <span className="line-clamp-2">
                    {order.delivery_address}
                  </span>
                </Td>
                <Td>
                  <Badge
                    value={order.status}
                    label={
                      order.status_display ||
                      optionLabel(DELIVERY_STATUSES, order.status)
                    }
                  />
                </Td>
                <Td>
                  <RowActions
                    onEdit={() => onEdit(order)}
                    onDelete={() => onDelete(order)}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  )
}

function ShipmentsView({
  shipments,
  loading,
  onCreate,
  onEdit,
  onDelete,
}) {
  if (loading) return <LoadingState />

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <a href={exportLogisticsShipmentsExcelUrl()} className="btn-secondary">
          Export Excel
        </a>
      </div>

      {!shipments.length ?(
        <EmptyState
          title="Aucune expédition"
          description="Créez une expédition à partir d'un ordre de livraison."
        />
      ) : (
        <TableShell>
          <TableHead>
            <Th>Suivi</Th>
            <Th>Ordre</Th>
            <Th>Date</Th>
            <Th>Véhicule</Th>
            <Th>Chauffeur</Th>
            <Th>Statut</Th>
            <Th className="text-right">Actions</Th>
          </TableHead>

          <tbody className="divide-y divide-slate-100">
            {shipments.map((shipment) => (
              <tr key={shipment.id} className="hover:bg-slate-50">
                <Td className="font-semibold text-slate-800">
                  {shipment.tracking_number}
                </Td>
                <Td>
                  {shipment.delivery_number ||
                    shipment.delivery_order_number ||
                    '—'}
                </Td>
                <Td>{formatDate(shipment.shipment_date)}</Td>
                <Td>
                  {shipment.vehicle_registration ||
                    shipment.vehicle_registration ||
                    '—'}
                </Td>
                <Td>
                  {shipment.driver_name ||
                    shipment.driver_employee_name ||
                    '—'}
                </Td>
                <Td>
                  <Badge
                    value={shipment.status}
                    label={
                      shipment.status_display ||
                      optionLabel(SHIPMENT_STATUSES, shipment.status)
                    }
                  />
                </Td>
                <Td>
                  <RowActions
                    onEdit={() => onEdit(shipment)}
                    onDelete={() => onDelete(shipment)}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  )
}

function TransfersView({
  transfers,
  loading,
  onCreate,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onTransit,
  onReceive,
  actingId,
}) {
  if (loading) return <LoadingState />

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <a href={exportLogisticsTransfersExcelUrl()} className="btn-secondary">
          Export Excel
        </a>
      </div>

      {!transfers.length ?(
        <EmptyState
          title="Aucun transfert"
          description="Les entrepôts crÀs dans Stockage sont disponibles ici."
        />
      ) : (
        <TableShell>
          <TableHead>
            <Th>Numéro</Th>
            <Th>Entrepôt source</Th>
            <Th>Entrepôt destination</Th>
            <Th>Transport</Th>
            <Th>Statut</Th>
            <Th>CrÀ le</Th>
            <Th className="text-right">Actions</Th>
          </TableHead>

          <tbody className="divide-y divide-slate-100">
            {transfers.map((transfer) => (
              <tr key={transfer.id} className="hover:bg-slate-50">
                <Td className="font-semibold text-slate-800">
                  {transfer.transfer_number}
                </Td>
                <Td>
                  {transfer.source_warehouse_name ||
                    transfer.source_entrepot_name ||
                    '—'}
                </Td>
                <Td>
                  {transfer.destination_warehouse_name ||
                    transfer.destination_entrepot_name ||
                    transfer.external_destination ||
                    '—'}
                </Td>
                <Td>
                  {transfer.transport_type === 'service'
                    ? `${transfer.service_company} · ${transfer.service_details}`
                    : `${transfer.vehicle_registration || 'Véhicule interne'} · ${
                        transfer.driver_name || 'Chauffeur non affecté'
                      }`}
                </Td>
                <Td>
                  <Badge
                    value={transfer.status}
                    label={
                      transfer.status_display ||
                      optionLabel(TRANSFER_STATUSES, transfer.status)
                    }
                  />
                </Td>
                <Td>{formatDateTime(transfer.created_at)}</Td>
                <Td>
                  <div className="flex flex-wrap justify-end gap-1">
                    {transfer.status === 'pending_approval' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onApprove(transfer)}
                          disabled={actingId === transfer.id}
                          className="rounded-md px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          Approuver
                        </button>
                        <button
                          type="button"
                          onClick={() => onReject(transfer)}
                          disabled={actingId === transfer.id}
                          className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Refuser
                        </button>
                      </>
                    )}
                    {transfer.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => onTransit(transfer)}
                        disabled={actingId === transfer.id}
                        className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                      >
                        En transit
                      </button>
                    )}
                    {transfer.status === 'in_transit' && (
                      <button
                        type="button"
                        onClick={() => onReceive(transfer)}
                        disabled={actingId === transfer.id}
                        className="rounded-md px-2 py-1 text-xs font-medium text-teal-600 hover:bg-teal-50 disabled:opacity-50"
                      >
                        Marquer reçu ✓
                      </button>
                    )}

                    <RowActions
                      onEdit={() => onEdit(transfer)}
                      onDelete={() => onDelete(transfer)}
                    />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  )
}

function TasksView({
  tasks,
  employees,
  loading,
  filters,
  setFilters,
  onCreate,
  onView,
  onEdit,
  onDelete,
  onImport,
  importing,
}) {
  const groupedEmployeeOptions = useMemo(() => {
    const groups = {}

    employees.forEach((employee) => {
      const department = employee.department_name || 'Sans département'
      if (!groups[department]) groups[department] = []
      groups[department].push(employee)
    })

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b, 'fr'))
      .map(([department, items]) => ({
        department,
        items: items.sort((a, b) =>
          `${a.last_name} ${a.first_name}`.localeCompare(
            `${b.last_name} ${b.first_name}`,
            'fr',
          ),
        ),
      }))
  }, [employees])

  const exportFilters = {
    status: filters.status,
    priority: filters.priority,
    employee: filters.employee,
    date_from: filters.date_from,
    date_to: filters.date_to,
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <a
            href={exportLogisticsTasksCsvUrl(exportFilters)}
            className="btn-secondary"
          >
            Export CSV
          </a>
          <a
            href={exportLogisticsTasksPdfUrl(exportFilters)}
            className="btn-secondary"
          >
            Export PDF
          </a>
          <a
            href={exportLogisticsTasksExcelUrl(exportFilters)}
            className="btn-secondary"
          >
            Export Excel
          </a>

          <label className="btn-secondary cursor-pointer">
            {importing ?'Importation…' : 'Importer CSV'}
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={importing}
              onChange={(event) => {
                const selectedFile = event.target.files?.[0]
                if (selectedFile) onImport(selectedFile)
                event.target.value = ''
              }}
              className="hidden"
            />
          </label>
        </div>

      </div>

      <div className="grid grid-cols-1 gap-3 border-y border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
        <div>
          <label className="label">Statut</label>
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value,
              }))
            }
            className="input"
          >
            <option value="">Tous</option>
            {TASK_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Priorité</label>
          <select
            value={filters.priority}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                priority: event.target.value,
              }))
            }
            className="input"
          >
            <option value="">Toutes</option>
            {TASK_PRIORITIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Employé</label>
          <select
            value={filters.employee}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                employee: event.target.value,
              }))
            }
            className="input"
          >
            <option value="">Tous les employés</option>
            {groupedEmployeeOptions.map((group) => (
              <optgroup key={group.department} label={group.department}>
                {group.items.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Du</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                date_from: event.target.value,
              }))
            }
            className="input"
          />
        </div>

        <div>
          <label className="label">Au</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                date_to: event.target.value,
              }))
            }
            className="input"
          />
        </div>
      </div>

      {loading ?(
        <LoadingState />
      ) : !tasks.length ?(
        <EmptyState
          title="Aucune tâche"
          description="Aucune tâche ne correspond aux filtres sélectionnés."
        />
      ) : (
        <TableShell>
          <TableHead>
            <Th>Tâche</Th>
            <Th>Priorité</Th>
            <Th>Échéance</Th>
            <Th>Employés assignés</Th>
            <Th>Département(s)</Th>
            <Th>Statut</Th>
            <Th className="text-right">Actions</Th>
          </TableHead>

          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const assigned = task.assigned_employee_details || []
              const departments = [
                ...new Set(
                  assigned.map(
                    (employee) =>
                      employee.department_name || 'Sans département',
                  ),
                ),
              ]

              return (
                <tr key={task.id} className="hover:bg-slate-50">
                  <Td className="min-w-56">
                    <p className="font-semibold text-slate-800">{task.title}</p>
                    {task.description && (
                      <p className="mt-1 line-clamp-2 max-w-md text-xs text-slate-400">
                        {task.description}
                      </p>
                    )}
                  </Td>
                  <Td>
                    <Badge
                      priority
                      value={task.priority}
                      label={
                        task.priority_display ||
                        optionLabel(TASK_PRIORITIES, task.priority)
                      }
                    />
                  </Td>
                  <Td>{formatDate(task.due_date)}</Td>
                  <Td className="min-w-48">
                    {assigned.length
                      ?assigned
                          .map(
                            (employee) =>
                              employee.full_name ||
                              `${employee.first_name} ${employee.last_name}`,
                          )
                          .join(', ')
                      : '—'}
                  </Td>
                  <Td>{departments.join(', ') || '—'}</Td>
                  <Td>
                    <Badge
                      value={task.status}
                      label={
                        task.status_display ||
                        optionLabel(TASK_STATUSES, task.status)
                      }
                    />
                  </Td>
                  <Td>
                    <RowActions
                      onView={() => onView(task)}
                      onEdit={() => onEdit(task)}
                      onDelete={() => onDelete(task)}
                    />
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </TableShell>
      )}
    </div>
  )
}
function ReportsView({
  performance,
  lateTasks,
  workload,
  reportJournal,
  loading,
  onSaved,
}) {
  const [reportTab, setReportTab] = useState('journal')
  const [reportForm, setReportForm] = useState({
    title: '',
    report_type: 'other',
    report_date: new Date().toISOString().slice(0, 10),
    content: '',
  })
  const [savingReport, setSavingReport] = useState(false)
  const [reportError, setReportError] = useState('')

  if (loading) return <LoadingState />

  const tabs = [
    { id: 'journal', label: 'Journal des rapports' },
    { id: 'performance', label: 'Performance employés' },
    { id: 'late', label: 'Tâches en retard' },
    { id: 'workload', label: 'Charge de travail' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setReportTab(tab.id)}
            className={`border-b-2 px-4 py-3 text-sm font-medium ${
              reportTab === tab.id
                ?'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {reportTab === 'journal' && (
        <div className="space-y-4">
          <form
            onSubmit={async (event) => {
              event.preventDefault()
              setSavingReport(true)
              setReportError('')
              try {
                await createLogisticsReport(reportForm)
                setReportForm({
                  title: '',
                  report_type: 'other',
                  report_date: new Date().toISOString().slice(0, 10),
                  content: '',
                })
                await onSaved()
              } catch (requestError) {
                setReportError(getErrorMessage(requestError))
              } finally {
                setSavingReport(false)
              }
            }}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="mb-4 font-semibold text-slate-800">
              Nouveau rapport logistique
            </h3>
            <ErrorBanner
              message={reportError}
              onClose={() => setReportError('')}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Titre *</label>
                <input
                  required
                  value={reportForm.title}
                  onChange={(event) =>
                    setReportForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="input"
                />
              </div>
              <div>
                <label className="label">Type</label>
                <select
                  value={reportForm.report_type}
                  onChange={(event) =>
                    setReportForm((current) => ({
                      ...current,
                      report_type: event.target.value,
                    }))
                  }
                  className="input"
                >
                  <option value="delivery">Livraison</option>
                  <option value="shipment">Expédition</option>
                  <option value="transfer">Transfert</option>
                  <option value="vehicle">Véhicule</option>
                  <option value="task">Tâche</option>
                  <option value="incident">Incident</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  value={reportForm.report_date}
                  onChange={(event) =>
                    setReportForm((current) => ({
                      ...current,
                      report_date: event.target.value,
                    }))
                  }
                  className="input"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Contenu *</label>
              <textarea
                required
                rows={5}
                value={reportForm.content}
                onChange={(event) =>
                  setReportForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                className="input resize-none"
                placeholder="Constats, incidents, actions réalisées et recommandations..."
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={savingReport}
                className="btn-primary"
              >
                {savingReport ? 'Enregistrement...' : 'Ajouter le rapport'}
              </button>
            </div>
          </form>

          <div className="flex justify-end">
            <a
              href={exportLogisticsReportJournalExcelUrl()}
              className="btn-secondary"
            >
              Export Excel
            </a>
          </div>

          {!reportJournal.length ? (
            <EmptyState
              title="Aucun rapport rédigé"
              description="Rédigez un rapport ci-dessus avant de l'exporter."
            />
          ) : (
            <TableShell>
              <TableHead>
                <Th>Date</Th>
                <Th>Type</Th>
                <Th>Titre</Th>
                <Th>Contenu</Th>
                <Th>Auteur</Th>
              </TableHead>
              <tbody className="divide-y divide-slate-100">
                {reportJournal.map((report) => (
                  <tr key={report.id}>
                    <Td>{formatDate(report.report_date)}</Td>
                    <Td>{report.report_type_display}</Td>
                    <Td className="font-semibold">{report.title}</Td>
                    <Td className="max-w-xl whitespace-pre-wrap">
                      {report.content}
                    </Td>
                    <Td>{report.created_by_name || '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </div>
      )}

      {reportTab === 'performance' && (
        <div>
          <div className="mb-4 flex justify-end gap-2">
            <a
              href={exportLogisticsEmployeePerformanceCsvUrl()}
              className="btn-secondary"
            >
              Export CSV
            </a>
            <a
              href={exportLogisticsEmployeePerformancePdfUrl()}
              className="btn-secondary"
            >
              Export PDF
            </a>
            <a href={exportLogisticsEmployeePerformanceExcelUrl()} className="btn-secondary">
              Export Excel
            </a>
          </div>

          {!performance.length ?(
            <EmptyState title="Aucune donnée de performance" />
          ) : (
            <TableShell>
              <TableHead>
                <Th>Matricule</Th>
                <Th>Employé</Th>
                <Th>Département</Th>
                <Th>Total</Th>
                <Th>Terminées</Th>
                <Th>En cours</Th>
                <Th>En retard</Th>
                <Th>Taux</Th>
              </TableHead>

              <tbody className="divide-y divide-slate-100">
                {performance.map((item) => (
                  <tr key={item.employee_id} className="hover:bg-slate-50">
                    <Td>{item.employee_number}</Td>
                    <Td className="font-semibold text-slate-800">
                      {item.employee_name}
                    </Td>
                    <Td>{item.department}</Td>
                    <Td>{item.total_tasks}</Td>
                    <Td>{item.completed_tasks}</Td>
                    <Td>{item.in_progress_tasks}</Td>
                    <Td>
                      <span
                        className={
                          item.late_tasks > 0
                            ?'font-semibold text-red-600'
                            : ''
                        }
                      >
                        {item.late_tasks}
                      </span>
                    </Td>
                    <Td>{item.completion_rate} %</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </div>
      )}

      {reportTab === 'late' && (
        <div>
          <div className="mb-4 flex justify-end gap-2">
            <a
              href={exportLogisticsLateTasksCsvUrl()}
              className="btn-secondary"
            >
              Export CSV
            </a>
            <a
              href={exportLogisticsLateTasksPdfUrl()}
              className="btn-secondary"
            >
              Export PDF
            </a>
            <a href={exportLogisticsLateTasksExcelUrl()} className="btn-secondary">
              Export Excel
            </a>
          </div>

          {!lateTasks.length ?(
            <EmptyState
              title="Aucune tâche en retard"
              description="Toutes les échéances actives sont respectées."
            />
          ) : (
            <TableShell>
              <TableHead>
                <Th>Tâche</Th>
                <Th>Priorité</Th>
                <Th>Statut</Th>
                <Th>Échéance</Th>
                <Th>Retard</Th>
                <Th>Employés</Th>
                <Th>Départements</Th>
              </TableHead>

              <tbody className="divide-y divide-slate-100">
                {lateTasks.map((item) => (
                  <tr key={item.task_id} className="hover:bg-slate-50">
                    <Td className="font-semibold text-slate-800">
                      {item.title}
                    </Td>
                    <Td>{item.priority}</Td>
                    <Td>{item.status}</Td>
                    <Td>{formatDate(item.due_date)}</Td>
                    <Td className="font-semibold text-red-600">
                      {item.days_late} jour(s)
                    </Td>
                    <Td>{item.assigned_employees}</Td>
                    <Td>{item.departments}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </div>
      )}

      {reportTab === 'workload' && (
        <div>
          <div className="mb-4 flex justify-end gap-2">
            <a
              href={exportLogisticsWorkloadCsvUrl()}
              className="btn-secondary"
            >
              Export CSV
            </a>
            <a
              href={exportLogisticsWorkloadPdfUrl()}
              className="btn-secondary"
            >
              Export PDF
            </a>
            <a href={exportLogisticsWorkloadExcelUrl()} className="btn-secondary">
              Export Excel
            </a>
          </div>

          {!workload.length ?(
            <EmptyState title="Aucune donnée de charge de travail" />
          ) : (
            <TableShell>
              <TableHead>
                <Th>Matricule</Th>
                <Th>Employé</Th>
                <Th>Département</Th>
                <Th>À faire</Th>
                <Th>En cours</Th>
                <Th>En attente</Th>
                <Th>Charge active</Th>
                <Th>Terminées</Th>
                <Th>Total</Th>
              </TableHead>

              <tbody className="divide-y divide-slate-100">
                {workload.map((item) => (
                  <tr key={item.employee_id} className="hover:bg-slate-50">
                    <Td>{item.employee_number}</Td>
                    <Td className="font-semibold text-slate-800">
                      {item.employee_name}
                    </Td>
                    <Td>{item.department}</Td>
                    <Td>{item.todo_tasks}</Td>
                    <Td>{item.in_progress_tasks}</Td>
                    <Td>{item.waiting_tasks}</Td>
                    <Td>
                      <span
                        className={`font-semibold ${
                          item.active_tasks >= 5
                            ?'text-red-600'
                            : 'text-blue-600'
                        }`}
                      >
                        {item.active_tasks}
                      </span>
                    </Td>
                    <Td>{item.completed_tasks}</Td>
                    <Td>{item.total_tasks}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </div>
      )}
    </div>
  )
}

function NotificationsView({
  notifications,
  loading,
  onRead,
  onReadAll,
}) {
  if (loading) return <LoadingState />

  return (
    <div>
      <div className="mb-4 flex justify-end rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={onReadAll}
          disabled={!notifications.some((item) => !item.is_read)}
          className="btn-secondary disabled:opacity-50"
        >
          Tout marquer comme lu
        </button>
      </div>

      {!notifications.length ?(
        <EmptyState
          title="Aucune notification"
          description="Les affectations, modifications et échéances apparaîtront ici."
        />
      ) : (
        <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => onRead(notification)}
              className={`block w-full px-5 py-4 text-left hover:bg-slate-50 ${
                notification.is_read
                  ?'bg-white'
                  : 'border-l-4 border-blue-600 bg-blue-50'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {notification.message}
                  </p>

                  {notification.task_title && (
                    <p className="mt-2 text-xs font-medium text-blue-600">
                      Tâche : {notification.task_title}
                    </p>
                  )}
                </div>

                <time className="shrink-0 text-xs text-slate-400">
                  {formatDateTime(notification.created_at)}
                </time>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LogisticsPage({
  tab = 'tableau-de-bord',
  onTabChange,
}) {
  const [activeTab, setActiveTab] = useState(
    APP_TAB_TO_VIEW[tab] || 'dashboard',
  )
  const [dashboard, setDashboard] = useState({})
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [deliveryOrders, setDeliveryOrders] = useState([])
  const [shipments, setShipments] = useState([])
  const [transfers, setTransfers] = useState([])
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [notifications, setNotifications] = useState([])
  const [performance, setPerformance] = useState([])
  const [lateTasks, setLateTasks] = useState([])
  const [workload, setWorkload] = useState([])
  const [reportJournal, setReportJournal] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [actingTransferId, setActingTransferId] = useState(null)
  const [importing, setImporting] = useState(false)
  const [taskFilters, setTaskFilters] = useState({
    status: '',
    priority: '',
    employee: '',
    date_from: '',
    date_to: '',
  })

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length

  const loadReferenceData = useCallback(async () => {
    const [employeeResponse, warehouseResponse] = await Promise.all([
      getEmployees({ page_size: 1000 }),
      getEntrepots({ page_size: 1000 }),
    ])

    setEmployees(
      listData(employeeResponse).filter((employee) => {
        const department = (employee.department_name || '').toLowerCase()
        return (
          department.includes('logistique') ||
          department.includes('logistics') ||
          department.includes('transport services')
        )
      }),
    )
    setWarehouses(listData(warehouseResponse))
  }, [])

  const loadDashboard = useCallback(async () => {
    const response = await getLogisticsDashboard()
    setDashboard(response || {})
  }, [])

  const loadVehicles = useCallback(async () => {
    const response = await getLogisticsVehicles({ page_size: 1000 })
    setVehicles(listData(response))
  }, [])

  const loadDrivers = useCallback(async () => {
    const response = await getLogisticsDrivers({ page_size: 1000 })
    setDrivers(listData(response))
  }, [])

  const loadDeliveryOrders = useCallback(async () => {
    const response = await getLogisticsDeliveryOrders({
      page_size: 1000,
    })
    setDeliveryOrders(listData(response))
  }, [])

  const loadShipments = useCallback(async () => {
    const response = await getLogisticsShipments({ page_size: 1000 })
    setShipments(listData(response))
  }, [])

  const loadTransfers = useCallback(async () => {
    const response = await getLogisticsWarehouseTransfers({
      page_size: 1000,
    })
    setTransfers(listData(response))
  }, [])

  const loadTasks = useCallback(async () => {
    const response = await getLogisticsTasks({
      ...taskFilters,
      page_size: 1000,
    })
    setTasks(listData(response))
  }, [taskFilters])

  const loadNotifications = useCallback(async () => {
    const response = await getLogisticsNotifications({
      page_size: 1000,
    })
    setNotifications(listData(response))
  }, [])

  const loadReports = useCallback(async () => {
    const [
      performanceResponse,
      lateResponse,
      workloadResponse,
      journalResponse,
    ] =
      await Promise.all([
        getLogisticsEmployeePerformance(),
        getLogisticsLateTasks(),
        getLogisticsWorkload(),
        getLogisticsReportJournal({ page_size: 1000 }),
      ])

    setPerformance(listData(performanceResponse))
    setLateTasks(listData(lateResponse))
    setWorkload(listData(workloadResponse))
    setReportJournal(listData(journalResponse))
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      await Promise.all([
        loadReferenceData(),
        loadDashboard(),
        loadVehicles(),
        loadDrivers(),
        loadDeliveryOrders(),
        loadShipments(),
        loadTransfers(),
        loadTasks(),
        loadNotifications(),
        loadReports(),
      ])
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [
    loadDashboard,
    loadDeliveryOrders,
    loadDrivers,
    loadNotifications,
    loadReferenceData,
    loadReports,
    loadShipments,
    loadTasks,
    loadTransfers,
    loadVehicles,
  ])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  useEffect(() => {
    setActiveTab(APP_TAB_TO_VIEW[tab] || 'dashboard')
  }, [tab])
    async function refreshAfterChange() {
    setError('')

    try {
      await Promise.all([
        loadDashboard(),
        loadVehicles(),
        loadDrivers(),
        loadDeliveryOrders(),
        loadShipments(),
        loadTransfers(),
        loadTasks(),
        loadNotifications(),
        loadReports(),
      ])
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  function requestDelete(type, item, label) {
    setDeleteTarget({ type, item, label })
  }

  async function confirmDelete() {
    if (!deleteTarget) return

    const deleteActions = {
      vehicle: () => deleteLogisticsVehicle(deleteTarget.item.id),
      driver: () => deleteLogisticsDriver(deleteTarget.item.id),
      deliveryOrder: () =>
        deleteLogisticsDeliveryOrder(deleteTarget.item.id),
      shipment: () => deleteLogisticsShipment(deleteTarget.item.id),
      transfer: () =>
        deleteLogisticsWarehouseTransfer(deleteTarget.item.id),
      task: () => deleteLogisticsTask(deleteTarget.item.id),
    }

    setDeleting(true)
    setError('')

    try {
      await deleteActions[deleteTarget.type]()
      setDeleteTarget(null)
      await refreshAfterChange()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setDeleting(false)
    }
  }

  async function handleTransferAction(transfer, actionName) {
    setActingTransferId(transfer.id)
    setError('')

    try {
      if (actionName === 'approve') {
        await approveLogisticsWarehouseTransfer(transfer.id)
      } else if (actionName === 'transit') {
        await transitLogisticsWarehouseTransfer(transfer.id)
      } else if (actionName === 'receive') {
        await receiveLogisticsWarehouseTransfer(transfer.id)
      } else {
        await rejectLogisticsWarehouseTransfer(transfer.id)
      }

      await refreshAfterChange()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setActingTransferId(null)
    }
  }

  async function handleImport(file) {
    setImporting(true)
    setError('')

    try {
      const result = await importLogisticsTasksCsv(file)
      await refreshAfterChange()

      if (result?.errors?.length) {
        setError(`Import termin? avec ${result.errors.length} erreur(s).`)
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setImporting(false)
    }
  }

  async function handleNotificationRead(notification) {
    try {
      if (!notification.is_read) {
        await markLogisticsNotificationRead(notification.id)
        await Promise.all([loadNotifications(), loadDashboard()])
      }

      if (notification.task) {
        setModal({
          type: 'taskDetails',
          taskId: notification.task,
        })
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  async function handleAllNotificationsRead() {
    try {
      await markAllLogisticsNotificationsRead()
      await Promise.all([loadNotifications(), loadDashboard()])
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  function renderActiveView() {
    if (activeTab === 'dashboard') {
      return (
        <DashboardView
          dashboard={dashboard}
          loading={loading}
          onNavigate={(view) => {
            const appTab = VIEW_TO_APP_TAB[view]
            if (appTab && onTabChange) onTabChange(appTab)
            else setActiveTab(view)
          }}
        />
      )
    }

    if (activeTab === 'vehicles') {
      return (
        <>
          <VehicleFormModal
            inline
            onClose={() => {}}
            onSaved={refreshAfterChange}
          />
          <VehiclesView
            vehicles={vehicles}
            loading={loading}
            onCreate={() => setModal({ type: 'vehicle' })}
            onEdit={(vehicle) => setModal({ type: 'vehicle', vehicle })}
            onDelete={(vehicle) =>
              requestDelete('vehicle', vehicle, vehicle.registration)
            }
          />
        </>
      )
    }

    if (activeTab === 'drivers') {
      return (
        <>
          <DriverFormModal
            inline
            employees={employees}
            onClose={() => {}}
            onSaved={refreshAfterChange}
          />
          <DriversView
            drivers={drivers}
            loading={loading}
            onCreate={() => setModal({ type: 'driver' })}
            onEdit={(driver) => setModal({ type: 'driver', driver })}
            onDelete={(driver) =>
              requestDelete(
                'driver',
                driver,
                driver.employee_name || driver.license_number,
              )
            }
          />
        </>
      )
    }

    if (activeTab === 'delivery-orders') {
      return (
        <>
          <DeliveryOrderFormModal
            inline
            onClose={() => {}}
            onSaved={refreshAfterChange}
          />
          <DeliveryOrdersView
            orders={deliveryOrders}
            loading={loading}
            onCreate={() => setModal({ type: 'deliveryOrder' })}
            onEdit={(order) =>
              setModal({ type: 'deliveryOrder', order })
            }
            onDelete={(order) =>
              requestDelete(
                'deliveryOrder',
                order,
                order.delivery_number,
              )
            }
          />
        </>
      )
    }

    if (activeTab === 'shipments') {
      return (
        <>
          <ShipmentFormModal
            inline
            deliveryOrders={deliveryOrders}
            vehicles={vehicles}
            drivers={drivers}
            onClose={() => {}}
            onSaved={refreshAfterChange}
          />
          <ShipmentsView
            shipments={shipments}
            loading={loading}
            onCreate={() => setModal({ type: 'shipment' })}
            onEdit={(shipment) =>
              setModal({ type: 'shipment', shipment })
            }
            onDelete={(shipment) =>
              requestDelete(
                'shipment',
                shipment,
                shipment.tracking_number,
              )
            }
          />
        </>
      )
    }

    if (activeTab === 'transfers') {
      return (
        <>
          <TransferFormModal
            inline
            warehouses={warehouses}
            vehicles={vehicles}
            drivers={drivers}
            onClose={() => {}}
            onSaved={refreshAfterChange}
          />
          <TransfersView
            transfers={transfers}
            loading={loading}
            actingId={actingTransferId}
            onCreate={() => setModal({ type: 'transfer' })}
            onEdit={(transfer) =>
              setModal({ type: 'transfer', transfer })
            }
            onDelete={(transfer) =>
              requestDelete(
                'transfer',
                transfer,
                transfer.transfer_number,
              )
            }
            onApprove={(transfer) =>
              handleTransferAction(transfer, 'approve')
            }
            onReject={(transfer) =>
              handleTransferAction(transfer, 'reject')
            }
            onTransit={(transfer) =>
              handleTransferAction(transfer, 'transit')
            }
            onReceive={(transfer) =>
              handleTransferAction(transfer, 'receive')
            }
          />
        </>
      )
    }

    if (activeTab === 'tasks') {
      return (
        <>
          <TaskFormModal
            inline
            employees={employees}
            vehicles={vehicles}
            drivers={drivers}
            tasks={tasks}
            onClose={() => {}}
            onSaved={refreshAfterChange}
          />
          <TasksView
            tasks={tasks}
            employees={employees}
            loading={loading}
            filters={taskFilters}
            setFilters={setTaskFilters}
            importing={importing}
            onImport={handleImport}
            onView={(task) =>
              setModal({
                type: 'taskDetails',
                taskId: task.id,
              })
            }
            onEdit={(task) => setModal({ type: 'task', task })}
            onDelete={(task) =>
              requestDelete('task', task, task.title)
            }
          />
        </>
      )
    }

    if (activeTab === 'reports') {
      return (
        <ReportsView
          performance={performance}
          lateTasks={lateTasks}
          workload={workload}
          reportJournal={reportJournal}
          loading={loading}
          onSaved={loadReports}
        />
      )
    }

    if (activeTab === 'notifications') {
      return (
        <NotificationsView
          notifications={notifications}
          loading={loading}
          onRead={handleNotificationRead}
          onReadAll={handleAllNotificationsRead}
        />
      )
    }

    return null
  }

  return (
    <div className="min-h-full bg-slate-50">
      <main className="mx-auto max-w-screen-2xl p-3 sm:p-5">
        <ErrorBanner message={error} onClose={() => setError('')} />
        {renderActiveView()}
      </main>

      {modal?.type === 'vehicle' && (
        <VehicleFormModal
          vehicle={modal.vehicle}
          onClose={() => setModal(null)}
          onSaved={refreshAfterChange}
        />
      )}

      {modal?.type === 'driver' && (
        <DriverFormModal
          driver={modal.driver}
          employees={employees}
          onClose={() => setModal(null)}
          onSaved={refreshAfterChange}
        />
      )}

      {modal?.type === 'deliveryOrder' && (
        <DeliveryOrderFormModal
          order={modal.order}
          onClose={() => setModal(null)}
          onSaved={refreshAfterChange}
        />
      )}

      {modal?.type === 'shipment' && (
        <ShipmentFormModal
          shipment={modal.shipment}
          deliveryOrders={deliveryOrders}
          vehicles={vehicles}
          drivers={drivers}
          onClose={() => setModal(null)}
          onSaved={refreshAfterChange}
        />
      )}

      {modal?.type === 'transfer' && (
        <TransferFormModal
          transfer={modal.transfer}
          warehouses={warehouses}
          vehicles={vehicles}
          drivers={drivers}
          onClose={() => setModal(null)}
          onSaved={refreshAfterChange}
        />
      )}

      {modal?.type === 'task' && (
        <TaskFormModal
          task={modal.task}
          employees={employees}
          vehicles={vehicles}
          drivers={drivers}
          tasks={tasks}
          onClose={() => setModal(null)}
          onSaved={refreshAfterChange}
        />
      )}

      {modal?.type === 'taskDetails' && (
        <TaskDetailsModal
          taskId={modal.taskId}
          onClose={() => setModal(null)}
          onChanged={refreshAfterChange}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Confirmer la suppression"
          message={`Voulez-vous vraiment supprimer « ${deleteTarget.label} » ? Cette action est définitive.`}
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  )
}

function PageActionBar({ title, description, children }) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

