<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold" style="color:var(--text-hi)">{{ t('nav.hr') }}</h1>
      <button class="btn-primary">+ Employé</button>
    </div>

    <div class="flex gap-1 border-b" style="border-color:var(--border)">
      <button v-for="tab in tabs" :key="tab.key"
        class="px-4 py-2 text-sm font-medium transition-colors"
        :style="activeTab === tab.key
          ? 'color:var(--accent);border-bottom:2px solid var(--accent);margin-bottom:-1px'
          : 'color:var(--text-md)'"
        @click="activeTab = tab.key">
        {{ tab.label }}
      </button>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Effectif actif</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--text-hi)">{{ kpi.activeEmployees }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Congés en attente</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--warning)">{{ kpi.pendingLeave }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Masse salariale (MAD)</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--accent)">{{ fmtAmount(kpi.totalSalary) }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Départements</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--text-hi)">{{ kpi.departments }}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <select class="erp-input w-44" v-model="filterStatus">
        <option value="">Tous statuts</option>
        <option value="active">Actif</option>
        <option value="on_leave">En congé</option>
        <option value="inactive">Inactif</option>
        <option value="terminated">Terminé</option>
      </select>
      <input class="erp-input flex-1 min-w-48" v-model="search" placeholder="Rechercher employé, code…" />
    </div>

    <div v-if="activeTab === 'employees'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Code</th><th>Nom complet</th><th>Département</th><th>Poste</th><th>Type</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="6" class="text-center py-8" style="color:var(--text-lo)">Chargement…</td></tr>
          <tr v-else-if="!employees.length"><td colspan="6" class="text-center py-8" style="color:var(--text-lo)">Aucun employé</td></tr>
          <tr v-for="e in employees" :key="e.id" v-else>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ e.emp_code }}</td>
            <td style="color:var(--text-hi)">{{ e.first_name }} {{ e.last_name }}</td>
            <td style="color:var(--text-md)">{{ e.department_name }}</td>
            <td style="color:var(--text-md)">{{ e.job_title }}</td>
            <td><span class="pill pill-neutral">{{ e.employment_type }}</span></td>
            <td><span :class="empStatusPill(e.status)">{{ e.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'departments'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Code</th><th>Nom</th><th>Responsable</th><th>Effectif</th></tr></thead>
        <tbody>
          <tr v-if="!departments.length"><td colspan="4" class="text-center py-8" style="color:var(--text-lo)">Aucun département</td></tr>
          <tr v-for="d in departments" :key="d.id" v-else>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ d.code }}</td>
            <td style="color:var(--text-hi)">{{ d.name }}</td>
            <td style="color:var(--text-md)">{{ d.manager_name || '—' }}</td>
            <td style="color:var(--text-hi)">{{ d.employee_count }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'timeoff'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Employé</th><th>Type</th><th>Du</th><th>Au</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-if="!timeOffRequests.length"><td colspan="5" class="text-center py-8" style="color:var(--text-lo)">Aucune demande de congé</td></tr>
          <tr v-for="r in timeOffRequests" :key="r.id" v-else>
            <td style="color:var(--text-hi)">{{ r.employee_name }}</td>
            <td><span class="pill pill-neutral">{{ r.leave_type }}</span></td>
            <td style="color:var(--text-md)">{{ fmtDate(r.start_date) }}</td>
            <td style="color:var(--text-md)">{{ fmtDate(r.end_date) }}</td>
            <td><span :class="leaveStatusPill(r.status)">{{ r.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'payroll'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Employé</th><th>Période</th><th>Salaire brut</th><th>Déductions</th><th>Net</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-if="!payrollRecords.length"><td colspan="6" class="text-center py-8" style="color:var(--text-lo)">Aucun bulletin de paie</td></tr>
          <tr v-for="p in payrollRecords" :key="p.id" v-else>
            <td style="color:var(--text-hi)">{{ p.employee_name }}</td>
            <td style="color:var(--text-md)">{{ p.period_start }} – {{ p.period_end }}</td>
            <td style="color:var(--text-hi)">{{ fmtAmount(p.gross_salary) }}</td>
            <td style="color:var(--danger)">{{ fmtAmount(p.deductions) }}</td>
            <td style="color:var(--success)">{{ fmtAmount(p.net_salary) }}</td>
            <td><span :class="p.status === 'paid' ? 'pill pill-success' : p.status === 'draft' ? 'pill pill-neutral' : 'pill pill-danger'">{{ p.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHrStore } from '@/stores/hr'

const { t } = useI18n()
const store = useHrStore()

const activeTab = ref('employees')
const filterStatus = ref('')
const search = ref('')
const loading = ref(false)

const tabs = [
  { key: 'employees', label: 'Employés' },
  { key: 'departments', label: 'Départements' },
  { key: 'timeoff', label: 'Congés' },
  { key: 'payroll', label: 'Paie' },
]

const kpi = computed(() => store.kpi)
const employees = computed(() => store.employees)
const departments = computed(() => store.departments)
const timeOffRequests = computed(() => store.timeOffRequests)
const payrollRecords = computed(() => store.payrollRecords)

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
function fmtAmount(v: number | string) {
  return Number(v).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
}
function empStatusPill(s: string) {
  const map: Record<string, string> = {
    active: 'pill pill-success', on_leave: 'pill pill-warning',
    inactive: 'pill pill-neutral', terminated: 'pill pill-danger',
  }
  return map[s] ?? 'pill pill-neutral'
}
function leaveStatusPill(s: string) {
  const map: Record<string, string> = {
    pending: 'pill pill-warning', approved: 'pill pill-success',
    rejected: 'pill pill-danger', cancelled: 'pill pill-neutral',
  }
  return map[s] ?? 'pill pill-neutral'
}

async function load() {
  loading.value = true
  await store.fetchAll({ status: filterStatus.value, search: search.value })
  loading.value = false
}

watch([filterStatus, search], () => load())
onMounted(() => load())
</script>
