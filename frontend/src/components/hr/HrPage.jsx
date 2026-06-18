import { useCallback, useEffect, useState } from 'react'
import {
  getEmployees,
  getDepartments,
  getLeaveRequests,
  getAttendanceSummary,
  getHRDashboard,
  deleteEmployee,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createAttendance,
  getAttendance,
  getContracts,
  createContract,
  getResignations,
  createResignation,
  getPayroll,
  createPayroll,
  getJobPositions,
  createJobPosition,
  getCandidates,
  createCandidate,
} from '../../api/client'
import EmployeeModal from './EmployeeModal'
import LeaveModal from './LeaveModal'
import AttendanceModal from './AttendanceModal'

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-amber-100 text-amber-700',
  suspended: 'bg-orange-100 text-orange-700',
  terminated: 'bg-red-100 text-red-700',
}

const STATUS_LABELS = {
  active: 'Actif',
  on_leave: 'En congé',
  suspended: 'Suspendu',
  terminated: 'Résilié',
}

const LEAVE_STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

const LEAVE_STATUS_LABELS = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  cancelled: 'Annulé',
}

const ATTENDANCE_STATUS_LABELS = {
  present: 'Présent',
  absent: 'Absent',
  late: 'En retard',
  half_day: 'Demi-journée',
}

const ATTENDANCE_STATUS_COLORS = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-amber-100 text-amber-700',
  half_day: 'bg-blue-100 text-blue-700',
}

const CONTRACT_TYPE_LABELS = {
  cdi: 'CDI',
  cdd: 'CDD',
  internship: 'Stage',
  anapec: 'ANAPEC',
  temporary: 'Temporaire',
}

const CONTRACT_STATUS_LABELS = {
  active: 'Actif',
  expired: 'Expiré',
  terminated: 'Résilié',
}

const RESIGNATION_STATUS_LABELS = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Rejetée',
  cancelled: 'Annulée',
}

const PAYROLL_STATUS_LABELS = {
  draft: 'Brouillon',
  validated: 'Validée',
  paid: 'Payée',
}

const POSITION_STATUS_LABELS = {
  open: 'Ouvert',
  closed: 'Fermé',
  on_hold: 'En pause',
}

function toArray(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

function fmtTime(value) {
  return value ? String(value).slice(0, 5) : '–'
}

function fmtShift(emp) {
  if (!emp?.shift_start && !emp?.shift_end) return 'Shift non défini'
  return `${fmtTime(emp?.shift_start)} - ${fmtTime(emp?.shift_end)}`
}

function fmtAttendanceTime(record, employee, field) {
  if (record.status === 'present') {
    return field === 'check_in' ? fmtTime(employee?.shift_start) : fmtTime(employee?.shift_end)
  }
  if (record.status === 'absent') return '–'
  if (record.status === 'late' && field === 'check_out') return fmtTime(employee?.shift_end)
  return fmtTime(record[field])
}

function htmlValue(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function downloadExcel(filename, rows, title = 'Export') {
  const headers = rows[0] ?? []
  const bodyRows = rows.slice(1)

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 12px; }
          th { background: #1f4e79; color: #ffffff; font-weight: 700; border: 1px solid #163a5a; padding: 8px; text-align: left; }
          td { border: 1px solid #d9e2f3; padding: 7px; vertical-align: middle; }
          tr:nth-child(even) td { background: #f8fbff; }
          .title { font-size: 18px; font-weight: 700; color: #1f4e79; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <div class="title">${htmlValue(title)}</div>
        <table>
          <thead>
            <tr>${headers.map((cell) => `<th>${htmlValue(cell)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${bodyRows.map((row) => `
              <tr>${row.map((cell) => `<td>${htmlValue(cell)}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`rounded-xl border p-5 bg-white flex flex-col gap-1 ${accent ?? 'border-slate-200'}`}>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-slate-800">{value ?? '–'}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

function Badge({ colorClass, label }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}

function Empty({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <p className="text-sm">{message}</p>
    </div>
  )
}

function FieldLabel({ children }) {
  return <label className="label">{children}</label>
}

export default function HRPage({ tab }) {
  const [dashboard, setDashboard] = useState(null)
  const [dashLoading, setDashLoading] = useState(false)

  const [employees, setEmployees] = useState([])
  const [empLoading, setEmpLoading] = useState(false)
  const [empSearch, setEmpSearch] = useState('')
  const [empDept, setEmpDept] = useState('')
  const [empStatus, setEmpStatus] = useState('')
  const [departments, setDepartments] = useState([])
  const [newDeptName, setNewDeptName] = useState('')
  const [deptSaving, setDeptSaving] = useState(false)
  const [empModal, setEmpModal] = useState(null)

  const [leaves, setLeaves] = useState([])
  const [leavesLoading, setLeavesLoading] = useState(false)
  const [leaveStatus, setLeaveStatus] = useState('')
  const [leaveModal, setLeaveModal] = useState(null)

  const [attendance, setAttendance] = useState([])
  const [attLoading, setAttLoading] = useState(false)
  const [attMonth, setAttMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [attDate, setAttDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dailyAttendance, setDailyAttendance] = useState({})
  const [bulkSaving, setBulkSaving] = useState(false)
  const [exportingAttendance, setExportingAttendance] = useState(false)
  const [attModal, setAttModal] = useState(null)
  const [detailEmployee, setDetailEmployee] = useState(null)
  const [detailRecords, setDetailRecords] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)

  const [contracts, setContracts] = useState([])
  const [contractsLoading, setContractsLoading] = useState(false)
  const [contractForm, setContractForm] = useState({
    employee: '',
    contract_type: 'cdi',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    base_salary: '',
    status: 'active',
    document: null,
    notes: '',
  })

  const [resignations, setResignations] = useState([])
  const [resignationForm, setResignationForm] = useState({
    employee: '',
    request_date: new Date().toISOString().slice(0, 10),
    leaving_date: new Date().toISOString().slice(0, 10),
    reason: '',
    document: null,
    status: 'pending',
  })

  const [payroll, setPayroll] = useState([])
  const [payrollLoading, setPayrollLoading] = useState(false)
  const [payrollForm, setPayrollForm] = useState(() => {
    const d = new Date()
    return {
      employee: '',
      month: String(d.getMonth() + 1),
      year: String(d.getFullYear()),
      base_salary: '',
      overtime_amount: '0',
      bonuses: '0',
      deductions: '0',
      status: 'draft',
      notes: '',
    }
  })

  const [jobPositions, setJobPositions] = useState([])
  const [candidates, setCandidates] = useState([])
  const [recruitmentLoading, setRecruitmentLoading] = useState(false)
  const [jobForm, setJobForm] = useState({
    job_title: '',
    department: '',
    description: '',
    required_qualifications: '',
    required_experience: '',
    number_of_openings: '1',
    status: 'open',
  })
  const [candidateForm, setCandidateForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    address: '',
    cv: null,
    evaluation: '',
  })

  const loadDashboard = useCallback(async () => {
    setDashLoading(true)
    try {
      setDashboard(await getHRDashboard())
    } finally {
      setDashLoading(false)
    }
  }, [])

  const loadDepartments = useCallback(async () => {
    const data = await getDepartments()
    setDepartments(toArray(data))
  }, [])

  const loadEmployees = useCallback(async () => {
    setEmpLoading(true)
    try {
      const params = {}
      if (empSearch) params.search = empSearch
      if (empDept) params.department = empDept
      if (empStatus) params.status = empStatus
      const data = await getEmployees(params)
      setEmployees(toArray(data))
    } finally {
      setEmpLoading(false)
    }
  }, [empSearch, empDept, empStatus])

  const loadLeaves = useCallback(async () => {
    setLeavesLoading(true)
    try {
      const params = {}
      if (leaveStatus) params.status = leaveStatus
      const data = await getLeaveRequests(params)
      setLeaves(toArray(data))
    } finally {
      setLeavesLoading(false)
    }
  }, [leaveStatus])

  const loadAttendance = useCallback(async () => {
    setAttLoading(true)
    try {
      const [year, month] = attMonth.split('-')
      const data = await getAttendanceSummary({ month, year })
      setAttendance(toArray(data))
    } finally {
      setAttLoading(false)
    }
  }, [attMonth])

  const loadContracts = useCallback(async () => {
    setContractsLoading(true)
    try {
      const [contractsData, resignationsData] = await Promise.all([
        getContracts(),
        getResignations(),
      ])
      setContracts(toArray(contractsData))
      setResignations(toArray(resignationsData))
    } finally {
      setContractsLoading(false)
    }
  }, [])

  const loadPayroll = useCallback(async () => {
    setPayrollLoading(true)
    try {
      const data = await getPayroll()
      setPayroll(toArray(data))
    } finally {
      setPayrollLoading(false)
    }
  }, [])

  const loadRecruitment = useCallback(async () => {
    setRecruitmentLoading(true)
    try {
      const [jobsData, candidatesData] = await Promise.all([
        getJobPositions(),
        getCandidates(),
      ])
      setJobPositions(toArray(jobsData))
      setCandidates(toArray(candidatesData))
    } finally {
      setRecruitmentLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'tableau-de-bord') loadDashboard()
  }, [tab, loadDashboard])

  useEffect(() => {
    if (tab === 'employes') {
      loadEmployees()
      loadDepartments().catch(() => setDepartments([]))
    }
  }, [tab, loadEmployees, loadDepartments])

  useEffect(() => {
    if (tab === 'conges') {
      loadLeaves()
      loadEmployees()
    }
  }, [tab, loadLeaves, loadEmployees])

  useEffect(() => {
    if (tab === 'pointage') {
      loadAttendance()
      loadEmployees()
    }
  }, [tab, loadAttendance, loadEmployees])

  useEffect(() => {
    if (tab === 'contrats') {
      loadContracts()
      loadEmployees()
    }
  }, [tab, loadContracts, loadEmployees])

  useEffect(() => {
    if (tab === 'paie') {
      loadPayroll()
      loadEmployees()
    }
  }, [tab, loadPayroll, loadEmployees])

  useEffect(() => {
    if (tab === 'recrutement') {
      loadRecruitment()
      loadDepartments().catch(() => setDepartments([]))
    }
  }, [tab, loadRecruitment, loadDepartments])

  async function handleDeleteEmployee(emp) {
    if (!window.confirm(`Supprimer ${emp.first_name} ${emp.last_name} ?`)) return
    try {
      await deleteEmployee(emp.id)
      loadEmployees()
    } catch {
      alert('Impossible de supprimer cet employé.')
    }
  }

  async function handleCreateDepartment() {
    const name = newDeptName.trim()
    if (!name) return

    setDeptSaving(true)
    try {
      await createDepartment({ name })
      setNewDeptName('')
      await loadDepartments()
    } catch {
      alert('Impossible d’ajouter le département.')
    } finally {
      setDeptSaving(false)
    }
  }

  async function handleRenameDepartment(department) {
    const name = window.prompt('Nouveau nom du département', department.name)
    if (!name?.trim() || name.trim() === department.name) return
    try {
      await updateDepartment(department.id, { name: name.trim() })
      await loadDepartments()
      await loadEmployees()
    } catch {
      alert('Impossible de modifier le département.')
    }
  }

  async function handleDeleteDepartment(department) {
    if (
      !window.confirm(
        `Supprimer le département « ${department.name} » ? Les employés ne seront pas supprimés, mais ils n'auront plus de département.`,
      )
    ) return
    try {
      await deleteDepartment(department.id)
      await loadDepartments()
      await loadEmployees()
    } catch {
      alert('Impossible de supprimer ce département.')
    }
  }

  function setDailyStatus(employeeId, status) {
    setDailyAttendance((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] ?? {}),
        status,
        check_in: status === 'late' ? (prev[employeeId]?.check_in ?? '') : '',
        overtime_hours: prev[employeeId]?.overtime_hours ?? '',
      },
    }))
  }

  function setDailyLateTime(employeeId, checkIn) {
    setDailyAttendance((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] ?? {}),
        status: 'late',
        check_in: checkIn,
      },
    }))
  }

  function setDailyOvertime(employeeId, overtimeHours) {
    setDailyAttendance((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] ?? {}),
        overtime_hours: overtimeHours,
      },
    }))
  }

  async function saveDailyAttendance() {
    const rows = Object.entries(dailyAttendance).filter(([, row]) => row.status)
    if (!rows.length) return

    setBulkSaving(true)
    try {
      await Promise.all(rows.map(([employeeId, row]) => {
        const payload = {
          employee: employeeId,
          date: attDate,
          status: row.status,
        }

        if (row.status === 'late' && row.check_in) payload.check_in = row.check_in
        if (row.overtime_hours !== '' && row.overtime_hours != null) payload.overtime_hours = row.overtime_hours

        return createAttendance(payload)
      }))

      setDailyAttendance({})
      loadAttendance()
      if (detailEmployee) loadAttendanceDetails(detailEmployee)
    } catch {
      alert('Impossible d’enregistrer le pointage.')
    } finally {
      setBulkSaving(false)
    }
  }

  async function loadAttendanceDetails(emp) {
    setDetailEmployee(emp)
    setDetailLoading(true)
    try {
      const data = await getAttendance({ employee: emp.id })
      setDetailRecords(toArray(data))
    } catch {
      setDetailRecords([])
    } finally {
      setDetailLoading(false)
    }
  }

  async function exportAttendanceDetails() {
    setExportingAttendance(true)
    try {
      const employeeMap = new Map(employees.map((emp) => [emp.id, emp]))
      const records = []
      let page = 1

      while (true) {
        const data = await getAttendance({ page })
        const pageRows = toArray(data)
        records.push(...pageRows)

        if (!data?.next || pageRows.length === 0) break
        page += 1
      }

      const rows = [[
        'Date',
        'Matricule',
        'Employé',
        'Poste',
        'Shift',
        'Statut',
        'Entrée',
        'Sortie',
        'Heures travaillées',
        'HS',
      ]]

      records.forEach((rec) => {
        const emp = employeeMap.get(rec.employee) ?? {}
        rows.push([
          rec.date,
          emp.employee_number ?? '',
          rec.employee_name ?? `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim(),
          emp.position ?? '',
          fmtShift(emp),
          ATTENDANCE_STATUS_LABELS[rec.status] ?? rec.status,
          fmtAttendanceTime(rec, emp, 'check_in'),
          fmtAttendanceTime(rec, emp, 'check_out'),
          Number(rec.worked_hours ?? 0).toFixed(2),
          Number(rec.overtime_hours ?? 0).toFixed(2),
        ])
      })

      downloadExcel(`pointage-${attMonth}.xls`, rows, 'Export pointage')
    } catch {
      alert('Impossible d’exporter le pointage.')
    } finally {
      setExportingAttendance(false)
    }
  }

  function exportJobPositions() {
    const rows = [[
      'Poste',
      'Département',
      'Ouvertures',
      'Statut',
      'Expérience requise',
      'Description',
      'Qualifications requises',
    ]]

    jobPositions.forEach((job) => {
      rows.push([
        job.job_title,
        job.department_name ?? '–',
        job.number_of_openings,
        POSITION_STATUS_LABELS[job.status] ?? job.status_display ?? job.status,
        job.required_experience ?? '',
        job.description ?? '',
        job.required_qualifications ?? '',
      ])
    })

    downloadExcel('postes-recrutement.xls', rows, 'Postes de recrutement')
  }

  async function handleCreateContract(e) {
    e.preventDefault()

    const payload = new FormData()
    payload.append('employee', contractForm.employee)
    payload.append('contract_type', contractForm.contract_type)
    payload.append('start_date', contractForm.start_date)
    payload.append('base_salary', contractForm.base_salary || 0)
    payload.append('status', contractForm.status)
    payload.append('notes', contractForm.notes)

    if (contractForm.contract_type !== 'cdi' && contractForm.end_date) {
      payload.append('end_date', contractForm.end_date)
    }

    if (contractForm.document) {
      payload.append('document', contractForm.document)
    }

    try {
      await createContract(payload)
      setContractForm({
        employee: '',
        contract_type: 'cdi',
        start_date: new Date().toISOString().slice(0, 10),
        end_date: '',
        base_salary: '',
        status: 'active',
        document: null,
        notes: '',
      })
      loadContracts()
    } catch {
      alert('Impossible d’ajouter le contrat.')
    }
  }

  async function handleCreateResignation(e) {
    e.preventDefault()

    const payload = new FormData()
    payload.append('employee', resignationForm.employee)
    payload.append('request_date', resignationForm.request_date)
    payload.append('leaving_date', resignationForm.leaving_date)
    payload.append('reason', resignationForm.reason)
    payload.append('status', resignationForm.status)

    if (resignationForm.document) {
      payload.append('document', resignationForm.document)
    }

    try {
      await createResignation(payload)
      setResignationForm({
        employee: '',
        request_date: new Date().toISOString().slice(0, 10),
        leaving_date: new Date().toISOString().slice(0, 10),
        reason: '',
        document: null,
        status: 'pending',
      })
      loadContracts()
    } catch {
      alert('Impossible d’ajouter la démission.')
    }
  }
    async function handleCreatePayroll(e) {
    e.preventDefault()

    try {
      await createPayroll({
        ...payrollForm,
        base_salary: payrollForm.base_salary || 0,
        overtime_amount: payrollForm.overtime_amount || 0,
        bonuses: payrollForm.bonuses || 0,
        deductions: payrollForm.deductions || 0,
      })

      setPayrollForm((prev) => ({
        ...prev,
        employee: '',
        base_salary: '',
        overtime_amount: '0',
        bonuses: '0',
        deductions: '0',
        notes: '',
      }))

      loadPayroll()
    } catch {
      alert('Impossible d’ajouter la paie.')
    }
  }

  async function handleCreateJob(e) {
    e.preventDefault()

    try {
      await createJobPosition({
        ...jobForm,
        department: jobForm.department || null,
        number_of_openings: jobForm.number_of_openings || 1,
      })

      setJobForm({
        job_title: '',
        department: '',
        description: '',
        required_qualifications: '',
        required_experience: '',
        number_of_openings: '1',
        status: 'open',
      })

      loadRecruitment()
    } catch {
      alert('Impossible d’ajouter le poste.')
    }
  }

  async function handleCreateCandidate(e) {
    e.preventDefault()

    const payload = new FormData()
    payload.append('first_name', candidateForm.first_name)
    payload.append('last_name', candidateForm.last_name)
    payload.append('phone_number', candidateForm.phone_number)
    payload.append('email', candidateForm.email)
    payload.append('address', candidateForm.address)
    payload.append('evaluation', candidateForm.evaluation)

    if (candidateForm.cv) {
      payload.append('cv', candidateForm.cv)
    }

    try {
      await createCandidate(payload)

      setCandidateForm({
        first_name: '',
        last_name: '',
        phone_number: '',
        email: '',
        address: '',
        cv: null,
        evaluation: '',
      })

      loadRecruitment()
    } catch {
      alert('Impossible d’ajouter le candidat.')
    }
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="space-y-4">
        {tab === 'tableau-de-bord' && (
          <div className="space-y-4">
            {dashLoading ? (
              <p className="text-sm text-slate-400">Chargement…</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <StatCard label="Employés actifs" value={dashboard?.total_employees} accent="border-emerald-200" />
                  <StatCard label="En congé" value={dashboard?.employees_on_leave} accent="border-amber-200" />
                  <StatCard label="Demandes en attente" value={dashboard?.pending_leave_requests} accent="border-blue-200" />
                  <StatCard label="Taux de présence" value={`${dashboard?.attendance_rate ?? 0}%`} accent="border-purple-200" />
                  <StatCard label="Contrats à renouveler" value={dashboard?.contracts_expiring_soon} accent="border-orange-200" />
                  <StatCard label="Démissions en attente" value={dashboard?.resignations_pending} accent="border-red-200" />
                  <StatCard label="Paies brouillon" value={dashboard?.payroll_drafts} accent="border-slate-200" />
                  <StatCard label="Postes ouverts" value={dashboard?.open_positions} accent="border-indigo-200" />
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-700">
                    Employés par département
                  </div>
                  <div className="p-5">
                    {(dashboard?.employees_by_department ?? []).length ? (
                      <div className="space-y-2">
                        {dashboard.employees_by_department.map((row, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">{row.department__name || 'Sans département'}</span>
                            <span className="font-semibold text-slate-800">{row.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty message="Aucune donnée disponible." />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'employes' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-col lg:flex-row gap-3">
                <input
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="input flex-1"
                  placeholder="Rechercher un employé…"
                />
                <select value={empDept} onChange={(e) => setEmpDept(e.target.value)} className="input lg:w-56">
                  <option value="">Tous les départements</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select value={empStatus} onChange={(e) => setEmpStatus(e.target.value)} className="input lg:w-44">
                  <option value="">Tous les statuts</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <button onClick={() => setEmpModal('create')} className="btn-primary whitespace-nowrap">
                  Nouvel employé
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="input flex-1"
                  placeholder="Nouveau département"
                />
                <button onClick={handleCreateDepartment} disabled={deptSaving} className="btn-secondary">
                  {deptSaving ? 'Ajout…' : 'Ajouter département'}
                </button>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                  Gérer les départements
                </p>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="grid grid-cols-[1fr_150px_180px] bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
                    <span>Département</span>
                    <span>Employés actifs</span>
                    <span className="text-right">Actions</span>
                  </div>
                  {departments.map((department) => (
                    <div
                      key={department.id}
                      className="grid grid-cols-[1fr_150px_180px] items-center border-t border-slate-100 px-4 py-3 text-sm"
                    >
                      <span className="font-medium text-slate-700">
                        {department.name}
                      </span>
                      <span className="text-slate-600">
                        {department.employee_count ?? 0}
                      </span>
                      <span className="text-right">
                      <button
                        type="button"
                        onClick={() => handleRenameDepartment(department)}
                        className="text-blue-600 hover:underline"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDepartment(department)}
                        className="text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {empLoading ? (
                <p className="p-5 text-sm text-slate-400">Chargement…</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-left">Matricule</th>
                        <th className="px-5 py-3 text-left">Nom</th>
                        <th className="px-5 py-3 text-left">Poste</th>
                        <th className="px-5 py-3 text-left">Département</th>
                        <th className="px-5 py-3 text-left">Shift</th>
                        <th className="px-5 py-3 text-left">Statut</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employees.map((emp) => (
                        <tr key={emp.id}>
                          <td className="px-5 py-3 font-mono">{emp.employee_number}</td>
                          <td className="px-5 py-3">{emp.first_name} {emp.last_name}</td>
                          <td className="px-5 py-3">{emp.position}</td>
                          <td className="px-5 py-3">{emp.department_name || '–'}</td>
                          <td className="px-5 py-3 font-mono">{fmtShift(emp)}</td>
                          <td className="px-5 py-3">
                            <Badge colorClass={STATUS_COLORS[emp.status]} label={STATUS_LABELS[emp.status] ?? emp.status} />
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button onClick={() => setEmpModal(emp)} className="text-blue-600 hover:underline text-sm mr-3">
                              Modifier
                            </button>
                            <button onClick={() => handleDeleteEmployee(emp)} className="text-red-600 hover:underline text-sm">
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'conges' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3 justify-between">
              <select value={leaveStatus} onChange={(e) => setLeaveStatus(e.target.value)} className="input sm:w-56">
                <option value="">Tous les statuts</option>
                {Object.entries(LEAVE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <button onClick={() => setLeaveModal('create')} className="btn-primary">
                Nouvelle demande
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {leavesLoading ? (
                <p className="p-5 text-sm text-slate-400">Chargement…</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-left">Employé</th>
                        <th className="px-5 py-3 text-left">Type</th>
                        <th className="px-5 py-3 text-left">Du</th>
                        <th className="px-5 py-3 text-left">Au</th>
                        <th className="px-5 py-3 text-left">Jours</th>
                        <th className="px-5 py-3 text-left">Statut</th>
                        <th className="px-5 py-3 text-left">Document</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaves.map((leave) => (
                        <tr key={leave.id} onClick={() => setLeaveModal(leave)} className="cursor-pointer hover:bg-slate-50">
                          <td className="px-5 py-3">{leave.employee_name}</td>
                          <td className="px-5 py-3">{leave.leave_type_display}</td>
                          <td className="px-5 py-3 font-mono">{leave.start_date}</td>
                          <td className="px-5 py-3 font-mono">{leave.end_date}</td>
                          <td className="px-5 py-3">{leave.number_of_days}</td>
                          <td className="px-5 py-3">
                            <Badge colorClass={LEAVE_STATUS_COLORS[leave.status]} label={LEAVE_STATUS_LABELS[leave.status] ?? leave.status_display} />
                          </td>
                          <td className="px-5 py-3">
                            {leave.document_url ? (
                              <a href={leave.document_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline">
                                Ouvrir
                              </a>
                            ) : '–'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
                {tab === 'pointage' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-col lg:flex-row gap-3 justify-between">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div>
                    <FieldLabel>Mois</FieldLabel>
                    <input
                      type="month"
                      value={attMonth}
                      onChange={(e) => setAttMonth(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <FieldLabel>Date du pointage</FieldLabel>
                    <input
                      type="date"
                      value={attDate}
                      onChange={(e) => setAttDate(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                  <button onClick={exportAttendanceDetails} disabled={exportingAttendance} className="btn-success">
                    {exportingAttendance ? 'Export…' : 'Exporter Excel'}
                  </button>
                  <button onClick={saveDailyAttendance} disabled={bulkSaving} className="btn-primary">
                    {bulkSaving ? 'Enregistrement…' : 'Enregistrer pointage'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-700">Pointage du jour</p>
                  <p className="text-xs text-slate-400 mt-0.5">Présent utilise automatiquement le shift. Absent laisse les heures vides.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3 text-left">Employé</th>
                      <th className="px-5 py-3 text-left">Poste</th>
                      <th className="px-5 py-3 text-left">Shift</th>
                      <th className="px-5 py-3 text-left">Statut</th>
                      <th className="px-5 py-3 text-left">Entrée retard</th>
                      <th className="px-5 py-3 text-left">HS</th>
                      <th className="px-5 py-3 text-right">Détails</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {employees.map((emp) => {
                      const row = dailyAttendance[emp.id] ?? {}
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <div className="font-medium text-slate-700">{emp.first_name} {emp.last_name}</div>
                            <div className="text-xs text-slate-400 font-mono">{emp.employee_number}</div>
                          </td>
                          <td className="px-5 py-3">{emp.position || '–'}</td>
                          <td className="px-5 py-3 font-mono">{fmtShift(emp)}</td>
                          <td className="px-5 py-3">
                            <select
                              value={row.status ?? ''}
                              onChange={(e) => setDailyStatus(emp.id, e.target.value)}
                              className="input min-w-[150px]"
                            >
                              <option value="">–</option>
                              <option value="present">Présent</option>
                              <option value="absent">Absent</option>
                              <option value="late">En retard</option>
                              <option value="half_day">Demi-journée</option>
                            </select>
                          </td>
                          <td className="px-5 py-3">
                            <input
                              type="time"
                              value={row.check_in ?? ''}
                              onChange={(e) => setDailyLateTime(emp.id, e.target.value)}
                              disabled={row.status !== 'late'}
                              className="input min-w-[120px] disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </td>
                          <td className="px-5 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.25"
                              value={row.overtime_hours ?? ''}
                              onChange={(e) => setDailyOvertime(emp.id, e.target.value)}
                              className="input min-w-[100px]"
                            />
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button onClick={() => loadAttendanceDetails(emp)} className="text-blue-600 hover:underline">
                              Détails
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-700">
                  Résumé mensuel
                </div>

                {attLoading ? (
                  <p className="p-5 text-sm text-slate-400">Chargement…</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-5 py-3 text-left">Employé</th>
                          <th className="px-5 py-3 text-left">Présences</th>
                          <th className="px-5 py-3 text-left">Absences</th>
                          <th className="px-5 py-3 text-left">Retards</th>
                          <th className="px-5 py-3 text-left">Heures</th>
                          <th className="px-5 py-3 text-left">HS</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {attendance.map((row) => (
                          <tr key={row.employee}>
                            <td className="px-5 py-3">{row.employee_name}</td>
                            <td className="px-5 py-3">{row.present_days}</td>
                            <td className="px-5 py-3">{row.absent_days}</td>
                            <td className="px-5 py-3">{row.late_arrivals}</td>
                            <td className="px-5 py-3">{Number(row.total_worked_hours ?? 0).toFixed(2)}</td>
                            <td className="px-5 py-3">{Number(row.total_overtime_hours ?? 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {detailEmployee && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-700">
                        Détails - {detailEmployee.first_name} {detailEmployee.last_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{fmtShift(detailEmployee)}</p>
                    </div>
                    <button onClick={() => setDetailEmployee(null)} className="btn-secondary">Fermer</button>
                  </div>

                  {detailLoading ? (
                    <p className="p-5 text-sm text-slate-400">Chargement…</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-5 py-3 text-left">Date</th>
                            <th className="px-5 py-3 text-left">Statut</th>
                            <th className="px-5 py-3 text-left">Entrée</th>
                            <th className="px-5 py-3 text-left">Sortie</th>
                            <th className="px-5 py-3 text-left">Heures</th>
                            <th className="px-5 py-3 text-left">HS</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {detailRecords.map((rec) => (
                            <tr key={rec.id}>
                              <td className="px-5 py-3 font-mono">{rec.date}</td>
                              <td className="px-5 py-3">
                                <Badge
                                  colorClass={ATTENDANCE_STATUS_COLORS[rec.status]}
                                  label={ATTENDANCE_STATUS_LABELS[rec.status] ?? rec.status_display}
                                />
                              </td>
                              <td className="px-5 py-3 font-mono">{fmtAttendanceTime(rec, detailEmployee, 'check_in')}</td>
                              <td className="px-5 py-3 font-mono">{fmtAttendanceTime(rec, detailEmployee, 'check_out')}</td>
                              <td className="px-5 py-3">{Number(rec.worked_hours ?? 0).toFixed(2)}</td>
                              <td className="px-5 py-3">{Number(rec.overtime_hours ?? 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
                {tab === 'contrats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <form onSubmit={handleCreateContract} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700">Nouveau contrat</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Employé</FieldLabel>
                    <select
                      value={contractForm.employee}
                      onChange={(e) => setContractForm((f) => ({ ...f, employee: e.target.value }))}
                      className="input"
                      required
                    >
                      <option value="">Sélectionner</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel>Type de contrat</FieldLabel>
                    <select
                      value={contractForm.contract_type}
                      onChange={(e) => setContractForm((f) => ({
                        ...f,
                        contract_type: e.target.value,
                        end_date: e.target.value === 'cdi' ? '' : f.end_date,
                      }))}
                      className="input"
                    >
                      {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel>Date de début</FieldLabel>
                    <input
                      type="date"
                      value={contractForm.start_date}
                      onChange={(e) => setContractForm((f) => ({ ...f, start_date: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>

                  {contractForm.contract_type !== 'cdi' && (
                    <div>
                      <FieldLabel>Date de fin</FieldLabel>
                      <input
                        type="date"
                        value={contractForm.end_date}
                        onChange={(e) => setContractForm((f) => ({ ...f, end_date: e.target.value }))}
                        className="input"
                      />
                    </div>
                  )}

                  <div>
                    <FieldLabel>Salaire de base</FieldLabel>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={contractForm.base_salary}
                      onChange={(e) => setContractForm((f) => ({ ...f, base_salary: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <FieldLabel>Statut</FieldLabel>
                    <select
                      value={contractForm.status}
                      onChange={(e) => setContractForm((f) => ({ ...f, status: e.target.value }))}
                      className="input"
                    >
                      {Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <FieldLabel>Document du contrat</FieldLabel>
                  <input
                    type="file"
                    onChange={(e) => setContractForm((f) => ({ ...f, document: e.target.files?.[0] ?? null }))}
                    className="input"
                  />
                </div>

                <div>
                  <FieldLabel>Notes</FieldLabel>
                  <textarea
                    value={contractForm.notes}
                    onChange={(e) => setContractForm((f) => ({ ...f, notes: e.target.value }))}
                    className="input resize-none"
                    rows={2}
                  />
                </div>

                <button type="submit" className="btn-primary">Ajouter contrat</button>
              </form>

              <form onSubmit={handleCreateResignation} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700">Nouvelle démission</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Employé</FieldLabel>
                    <select
                      value={resignationForm.employee}
                      onChange={(e) => setResignationForm((f) => ({ ...f, employee: e.target.value }))}
                      className="input"
                      required
                    >
                      <option value="">Sélectionner</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel>Statut</FieldLabel>
                    <select
                      value={resignationForm.status}
                      onChange={(e) => setResignationForm((f) => ({ ...f, status: e.target.value }))}
                      className="input"
                    >
                      {Object.entries(RESIGNATION_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel>Date de demande</FieldLabel>
                    <input
                      type="date"
                      value={resignationForm.request_date}
                      onChange={(e) => setResignationForm((f) => ({ ...f, request_date: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <FieldLabel>Date de départ</FieldLabel>
                    <input
                      type="date"
                      value={resignationForm.leaving_date}
                      onChange={(e) => setResignationForm((f) => ({ ...f, leaving_date: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Motif</FieldLabel>
                  <textarea
                    value={resignationForm.reason}
                    onChange={(e) => setResignationForm((f) => ({ ...f, reason: e.target.value }))}
                    className="input resize-none"
                    rows={2}
                  />
                </div>

                <div>
                  <FieldLabel>Document de démission</FieldLabel>
                  <input
                    type="file"
                    onChange={(e) => setResignationForm((f) => ({ ...f, document: e.target.files?.[0] ?? null }))}
                    className="input"
                  />
                </div>

                <button type="submit" className="btn-primary">Ajouter démission</button>
              </form>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-700">Contrats</div>
                {contractsLoading ? (
                  <p className="p-5 text-sm text-slate-400">Chargement…</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-5 py-3 text-left">Employé</th>
                          <th className="px-5 py-3 text-left">Type</th>
                          <th className="px-5 py-3 text-left">Début</th>
                          <th className="px-5 py-3 text-left">Fin</th>
                          <th className="px-5 py-3 text-left">Salaire</th>
                          <th className="px-5 py-3 text-left">Statut</th>
                          <th className="px-5 py-3 text-left">Document</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {contracts.map((contract) => (
                          <tr key={contract.id}>
                            <td className="px-5 py-3">{contract.employee_name}</td>
                            <td className="px-5 py-3">{CONTRACT_TYPE_LABELS[contract.contract_type] ?? contract.contract_type_display}</td>
                            <td className="px-5 py-3 font-mono">{contract.start_date}</td>
                            <td className="px-5 py-3 font-mono">{contract.end_date ?? '–'}</td>
                            <td className="px-5 py-3">{Number(contract.base_salary ?? 0).toFixed(2)}</td>
                            <td className="px-5 py-3">{CONTRACT_STATUS_LABELS[contract.status] ?? contract.status_display}</td>
                            <td className="px-5 py-3">
                              {contract.document_url ? (
                                <a href={contract.document_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                  Ouvrir
                                </a>
                              ) : '–'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-700">Démissions</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-left">Employé</th>
                        <th className="px-5 py-3 text-left">Demande</th>
                        <th className="px-5 py-3 text-left">Départ</th>
                        <th className="px-5 py-3 text-left">Statut</th>
                        <th className="px-5 py-3 text-left">Motif</th>
                        <th className="px-5 py-3 text-left">Document</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resignations.map((resignation) => (
                        <tr key={resignation.id}>
                          <td className="px-5 py-3">{resignation.employee_name}</td>
                          <td className="px-5 py-3 font-mono">{resignation.request_date}</td>
                          <td className="px-5 py-3 font-mono">{resignation.leaving_date}</td>
                          <td className="px-5 py-3">{RESIGNATION_STATUS_LABELS[resignation.status] ?? resignation.status_display}</td>
                          <td className="px-5 py-3">{resignation.reason || '–'}</td>
                          <td className="px-5 py-3">
                            {resignation.document_url ? (
                              <a href={resignation.document_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                Ouvrir
                              </a>
                            ) : '–'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
                {tab === 'paie' && (
          <div className="space-y-4">
            <form onSubmit={handleCreatePayroll} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700">Nouvelle paie</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <FieldLabel>Employé</FieldLabel>
                  <select
                    value={payrollForm.employee}
                    onChange={(e) => setPayrollForm((f) => ({ ...f, employee: e.target.value }))}
                    className="input"
                    required
                  >
                    <option value="">Sélectionner</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel>Mois</FieldLabel>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={payrollForm.month}
                    onChange={(e) => setPayrollForm((f) => ({ ...f, month: e.target.value }))}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <FieldLabel>Année</FieldLabel>
                  <input
                    type="number"
                    min="2000"
                    value={payrollForm.year}
                    onChange={(e) => setPayrollForm((f) => ({ ...f, year: e.target.value }))}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <FieldLabel>Statut</FieldLabel>
                  <select
                    value={payrollForm.status}
                    onChange={(e) => setPayrollForm((f) => ({ ...f, status: e.target.value }))}
                    className="input"
                  >
                    {Object.entries(PAYROLL_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel>Salaire de base</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payrollForm.base_salary}
                    onChange={(e) => setPayrollForm((f) => ({ ...f, base_salary: e.target.value }))}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <FieldLabel>Montant HS</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payrollForm.overtime_amount}
                    onChange={(e) => setPayrollForm((f) => ({ ...f, overtime_amount: e.target.value }))}
                    className="input"
                  />
                </div>

                <div>
                  <FieldLabel>Primes</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payrollForm.bonuses}
                    onChange={(e) => setPayrollForm((f) => ({ ...f, bonuses: e.target.value }))}
                    className="input"
                  />
                </div>

                <div>
                  <FieldLabel>Retenues</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payrollForm.deductions}
                    onChange={(e) => setPayrollForm((f) => ({ ...f, deductions: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Notes</FieldLabel>
                <textarea
                  value={payrollForm.notes}
                  onChange={(e) => setPayrollForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input resize-none"
                  rows={2}
                />
              </div>

              <button type="submit" className="btn-primary">Ajouter paie</button>
            </form>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {payrollLoading ? (
                <p className="p-5 text-sm text-slate-400">Chargement…</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-left">Employé</th>
                        <th className="px-5 py-3 text-left">Période</th>
                        <th className="px-5 py-3 text-left">Base</th>
                        <th className="px-5 py-3 text-left">HS</th>
                        <th className="px-5 py-3 text-left">Primes</th>
                        <th className="px-5 py-3 text-left">Retenues</th>
                        <th className="px-5 py-3 text-left">Net</th>
                        <th className="px-5 py-3 text-left">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payroll.map((row) => (
                        <tr key={row.id}>
                          <td className="px-5 py-3">{row.employee_name}</td>
                          <td className="px-5 py-3 font-mono">{String(row.month).padStart(2, '0')}/{row.year}</td>
                          <td className="px-5 py-3">{Number(row.base_salary ?? 0).toFixed(2)}</td>
                          <td className="px-5 py-3">{Number(row.overtime_amount ?? 0).toFixed(2)}</td>
                          <td className="px-5 py-3">{Number(row.bonuses ?? 0).toFixed(2)}</td>
                          <td className="px-5 py-3">{Number(row.deductions ?? 0).toFixed(2)}</td>
                          <td className="px-5 py-3 font-semibold">{Number(row.net_salary ?? 0).toFixed(2)}</td>
                          <td className="px-5 py-3">{PAYROLL_STATUS_LABELS[row.status] ?? row.status_display}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'recrutement' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <form onSubmit={handleCreateJob} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700">Nouveau poste</p>

                <div>
                  <FieldLabel>Intitulé du poste</FieldLabel>
                  <input
                    value={jobForm.job_title}
                    onChange={(e) => setJobForm((f) => ({ ...f, job_title: e.target.value }))}
                    className="input"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>Département</FieldLabel>
                    <select
                      value={jobForm.department}
                      onChange={(e) => setJobForm((f) => ({ ...f, department: e.target.value }))}
                      className="input"
                    >
                      <option value="">Sans département</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel>Postes ouverts</FieldLabel>
                    <input
                      type="number"
                      min="1"
                      value={jobForm.number_of_openings}
                      onChange={(e) => setJobForm((f) => ({ ...f, number_of_openings: e.target.value }))}
                      className="input"
                    />
                  </div>

                  <div>
                    <FieldLabel>Statut</FieldLabel>
                    <select
                      value={jobForm.status}
                      onChange={(e) => setJobForm((f) => ({ ...f, status: e.target.value }))}
                      className="input"
                    >
                      {Object.entries(POSITION_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <FieldLabel>Expérience requise</FieldLabel>
                  <input
                    value={jobForm.required_experience}
                    onChange={(e) => setJobForm((f) => ({ ...f, required_experience: e.target.value }))}
                    className="input"
                  />
                </div>

                <div>
                  <FieldLabel>Description</FieldLabel>
                  <textarea
                    value={jobForm.description}
                    onChange={(e) => setJobForm((f) => ({ ...f, description: e.target.value }))}
                    className="input resize-none"
                    rows={2}
                  />
                </div>

                <div>
                  <FieldLabel>Qualifications requises</FieldLabel>
                  <textarea
                    value={jobForm.required_qualifications}
                    onChange={(e) => setJobForm((f) => ({ ...f, required_qualifications: e.target.value }))}
                    className="input resize-none"
                    rows={2}
                  />
                </div>

                <button type="submit" className="btn-primary">Ajouter poste</button>
              </form>

              <form onSubmit={handleCreateCandidate} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700">Nouveau candidat</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Prénom</FieldLabel>
                    <input
                      value={candidateForm.first_name}
                      onChange={(e) => setCandidateForm((f) => ({ ...f, first_name: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <FieldLabel>Nom</FieldLabel>
                    <input
                      value={candidateForm.last_name}
                      onChange={(e) => setCandidateForm((f) => ({ ...f, last_name: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <FieldLabel>Téléphone</FieldLabel>
                    <input
                      value={candidateForm.phone_number}
                      onChange={(e) => setCandidateForm((f) => ({ ...f, phone_number: e.target.value }))}
                      className="input"
                    />
                  </div>

                  <div>
                    <FieldLabel>E-mail</FieldLabel>
                    <input
                      type="email"
                      value={candidateForm.email}
                      onChange={(e) => setCandidateForm((f) => ({ ...f, email: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Adresse</FieldLabel>
                  <textarea
                    value={candidateForm.address}
                    onChange={(e) => setCandidateForm((f) => ({ ...f, address: e.target.value }))}
                    className="input resize-none"
                    rows={2}
                  />
                </div>

                <div>
                  <FieldLabel>CV</FieldLabel>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => setCandidateForm((f) => ({ ...f, cv: e.target.files?.[0] ?? null }))}
                    className="input"
                  />
                </div>

                <div>
                  <FieldLabel>Évaluation / observations</FieldLabel>
                  <textarea
                    value={candidateForm.evaluation}
                    onChange={(e) => setCandidateForm((f) => ({ ...f, evaluation: e.target.value }))}
                    className="input resize-none"
                    rows={3}
                  />
                </div>

                <button type="submit" className="btn-primary">Ajouter candidat</button>
              </form>
            </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-700">Postes ouverts</p>
                  <button
                    type="button"
                    onClick={exportJobPositions}
                    className="btn-success whitespace-nowrap"
                    disabled={!jobPositions.length}
                  >
                    Exporter Excel
                  </button>
                </div>

                {recruitmentLoading ? (
                  <p className="p-5 text-sm text-slate-400">Chargement…</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-5 py-3 text-left">Poste</th>
                          <th className="px-5 py-3 text-left">Département</th>
                          <th className="px-5 py-3 text-left">Ouvertures</th>
                          <th className="px-5 py-3 text-left">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {jobPositions.map((job) => (
                          <tr key={job.id}>
                            <td className="px-5 py-3">{job.job_title}</td>
                            <td className="px-5 py-3">{job.department_name ?? '–'}</td>
                            <td className="px-5 py-3">{job.number_of_openings}</td>
                            <td className="px-5 py-3">{POSITION_STATUS_LABELS[job.status] ?? job.status_display}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-700">
                  Candidats
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-left">Nom</th>
                        <th className="px-5 py-3 text-left">Téléphone</th>
                        <th className="px-5 py-3 text-left">E-mail</th>
                        <th className="px-5 py-3 text-left">CV</th>
                        <th className="px-5 py-3 text-left">Évaluation</th>
                        <th className="px-5 py-3 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {candidates.map((candidate) => (
                        <tr key={candidate.id}>
                          <td className="px-5 py-3">{candidate.first_name} {candidate.last_name}</td>
                          <td className="px-5 py-3">{candidate.phone_number || '–'}</td>
                          <td className="px-5 py-3">{candidate.email || '–'}</td>
                          <td className="px-5 py-3">
                            {candidate.cv_url ? (
                              <a href={candidate.cv_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                Ouvrir
                              </a>
                            ) : '–'}
                          </td>
                          <td className="px-5 py-3">{candidate.evaluation || '–'}</td>
                          <td className="px-5 py-3 font-mono">{candidate.application_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {empModal && (
        <EmployeeModal
          employee={empModal === 'create' ? null : empModal}
          departments={departments}
          onClose={() => setEmpModal(null)}
          onSaved={() => { setEmpModal(null); loadEmployees(); loadDashboard() }}
        />
      )}

      {leaveModal && (
        <LeaveModal
          leave={leaveModal === 'create' ? null : leaveModal}
          employees={employees}
          onClose={() => setLeaveModal(null)}
          onSaved={() => { setLeaveModal(null); loadLeaves(); loadDashboard() }}
        />
      )}

      {attModal && (
        <AttendanceModal
          record={attModal === 'create' ? null : attModal}
          employees={employees}
          onClose={() => setAttModal(null)}
          onSaved={() => { setAttModal(null); loadAttendance() }}
        />
      )}
    </div>
  )
}
