<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold" style="color:var(--text-hi)">{{ t('nav.quality') }}</h1>
      <button class="btn-primary">+ Inspection</button>
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
        <p class="text-xs font-medium" style="color:var(--text-lo)">Inspections ce mois</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--text-hi)">{{ kpi.inspectionsThisMonth }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Non-conformités ouvertes</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--danger)">{{ kpi.openNCRs }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">CAPAs en cours</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--warning)">{{ kpi.openCAPAs }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Taux conformité</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--success)">{{ kpi.conformityRate }}%</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <select class="erp-input w-44" v-model="filterStatus">
        <option value="">Tous statuts</option>
        <option value="planned">Planifiée</option>
        <option value="in_progress">En cours</option>
        <option value="passed">Conforme</option>
        <option value="failed">Non conforme</option>
        <option value="on_hold">En attente</option>
      </select>
      <input class="erp-input flex-1 min-w-48" v-model="search" placeholder="Rechercher réf…" />
    </div>

    <div v-if="activeTab === 'inspections'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Réf</th><th>Date</th><th>Inspecteur</th><th>Réf commande</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="5" class="text-center py-8" style="color:var(--text-lo)">Chargement…</td></tr>
          <tr v-else-if="!inspections.length"><td colspan="5" class="text-center py-8" style="color:var(--text-lo)">Aucune inspection</td></tr>
          <tr v-for="i in inspections" :key="i.id" v-else>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ i.ref }}</td>
            <td style="color:var(--text-md)">{{ fmtDate(i.inspection_date) }}</td>
            <td style="color:var(--text-hi)">{{ i.inspector_name }}</td>
            <td style="color:var(--text-md)">{{ i.sales_order_ref || '—' }}</td>
            <td><span :class="inspStatusPill(i.status)">{{ i.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'ncrs'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Réf</th><th>Description</th><th>Sévérité</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-if="!ncrs.length"><td colspan="4" class="text-center py-8" style="color:var(--text-lo)">Aucune non-conformité</td></tr>
          <tr v-for="n in ncrs" :key="n.id" v-else>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ n.ref }}</td>
            <td style="color:var(--text-hi)">{{ n.description }}</td>
            <td><span :class="severityPill(n.severity)">{{ n.severity }}</span></td>
            <td><span :class="ncrStatusPill(n.status)">{{ n.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'capas'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Type</th><th>Description</th><th>Assigné à</th><th>Échéance</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-if="!capas.length"><td colspan="5" class="text-center py-8" style="color:var(--text-lo)">Aucune CAPA</td></tr>
          <tr v-for="c in capas" :key="c.id" v-else>
            <td><span :class="c.action_type === 'corrective' ? 'pill pill-warning' : 'pill pill-info'">{{ c.action_type }}</span></td>
            <td style="color:var(--text-hi)">{{ c.description }}</td>
            <td style="color:var(--text-md)">{{ c.assigned_to_name }}</td>
            <td style="color:var(--text-md)">{{ fmtDate(c.due_date) }}</td>
            <td><span :class="capaStatusPill(c.status)">{{ c.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'audits'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Réf</th><th>Type</th><th>Auditeur</th><th>Date prévue</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-if="!audits.length"><td colspan="5" class="text-center py-8" style="color:var(--text-lo)">Aucun audit</td></tr>
          <tr v-for="a in audits" :key="a.id" v-else>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ a.ref }}</td>
            <td><span :class="a.audit_type === 'internal' ? 'pill pill-info' : 'pill pill-warning'">{{ a.audit_type }}</span></td>
            <td style="color:var(--text-hi)">{{ a.auditor }}</td>
            <td style="color:var(--text-md)">{{ fmtDate(a.planned_date) }}</td>
            <td><span :class="auditStatusPill(a.status)">{{ a.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQualityStore } from '@/stores/quality'

const { t } = useI18n()
const store = useQualityStore()

const activeTab = ref('inspections')
const filterStatus = ref('')
const search = ref('')
const loading = ref(false)

const tabs = [
  { key: 'inspections', label: 'Inspections' },
  { key: 'ncrs', label: 'Non-conformités' },
  { key: 'capas', label: 'CAPA' },
  { key: 'audits', label: 'Audits' },
]

const kpi = computed(() => store.kpi)
const inspections = computed(() => store.inspections)
const ncrs = computed(() => store.ncrs)
const capas = computed(() => store.capas)
const audits = computed(() => store.audits)

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
function inspStatusPill(s: string) {
  const map: Record<string, string> = {
    planned: 'pill pill-info', in_progress: 'pill pill-warning',
    passed: 'pill pill-success', failed: 'pill pill-danger', on_hold: 'pill pill-neutral',
  }
  return map[s] ?? 'pill pill-neutral'
}
function severityPill(s: string) {
  return s === 'critical' ? 'pill pill-danger' : s === 'major' ? 'pill pill-warning' : 'pill pill-neutral'
}
function ncrStatusPill(s: string) {
  const map: Record<string, string> = {
    open: 'pill pill-danger', under_review: 'pill pill-warning',
    resolved: 'pill pill-success', closed: 'pill pill-neutral',
  }
  return map[s] ?? 'pill pill-neutral'
}
function capaStatusPill(s: string) {
  const map: Record<string, string> = {
    open: 'pill pill-warning', in_progress: 'pill pill-info',
    completed: 'pill pill-success', verified: 'pill pill-accent',
  }
  return map[s] ?? 'pill pill-neutral'
}
function auditStatusPill(s: string) {
  const map: Record<string, string> = {
    planned: 'pill pill-info', in_progress: 'pill pill-warning', completed: 'pill pill-success',
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
