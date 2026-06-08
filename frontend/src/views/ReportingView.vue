<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold" style="color:var(--text-hi)">{{ t('nav.reporting') }}</h1>
      <button class="btn-primary">+ Rapport sauvegardé</button>
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
        <p class="text-xs font-medium" style="color:var(--text-lo)">Rapports sauvegardés</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--text-hi)">{{ kpi.savedReports }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Envois programmés</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--accent)">{{ kpi.scheduledReports }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Rapports publics</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--info)">{{ kpi.publicReports }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Modules couverts</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--success)">{{ kpi.modulesCovered }}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <select class="erp-input w-44" v-model="filterModule">
        <option value="">Tous modules</option>
        <option value="sales">Ventes</option>
        <option value="purchase">Achats</option>
        <option value="inventory">Stocks</option>
        <option value="production">Production</option>
        <option value="quality">Qualité</option>
        <option value="hr">RH</option>
        <option value="finance">Finance</option>
      </select>
      <input class="erp-input flex-1 min-w-48" v-model="search" placeholder="Rechercher rapport…" />
    </div>

    <div v-if="activeTab === 'saved'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Nom</th><th>Description</th><th>Module</th><th>Public</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="5" class="text-center py-8" style="color:var(--text-lo)">Chargement…</td></tr>
          <tr v-else-if="!savedReports.length"><td colspan="5" class="text-center py-8" style="color:var(--text-lo)">Aucun rapport sauvegardé</td></tr>
          <tr v-for="r in savedReports" :key="r.id" v-else>
            <td style="color:var(--text-hi)">{{ r.name }}</td>
            <td style="color:var(--text-md)">{{ r.description }}</td>
            <td><span class="pill pill-info">{{ r.module }}</span></td>
            <td><span :class="r.is_public ? 'pill pill-success' : 'pill pill-neutral'">{{ r.is_public ? 'Oui' : 'Non' }}</span></td>
            <td>
              <button class="text-xs mr-3" style="color:var(--accent)">Exécuter</button>
              <button class="text-xs" style="color:var(--text-lo)">Planifier</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'scheduled'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Rapport</th><th>Cron</th><th>Destinataires</th><th>Dernier envoi</th><th>Prochain envoi</th><th>Actif</th></tr></thead>
        <tbody>
          <tr v-if="!scheduledReports.length"><td colspan="6" class="text-center py-8" style="color:var(--text-lo)">Aucun envoi programmé</td></tr>
          <tr v-for="s in scheduledReports" :key="s.id" v-else>
            <td style="color:var(--text-hi)">{{ s.saved_report_name }}</td>
            <td class="font-mono text-xs" style="color:var(--text-md)">{{ s.schedule_cron }}</td>
            <td style="color:var(--text-md)">{{ s.recipients_emails }}</td>
            <td style="color:var(--text-lo)">{{ fmtDate(s.last_run) }}</td>
            <td style="color:var(--text-md)">{{ fmtDate(s.next_run) }}</td>
            <td><span :class="s.is_active ? 'pill pill-success' : 'pill pill-neutral'">{{ s.is_active ? 'Actif' : 'Inactif' }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useReportingStore } from '@/stores/reporting'

const { t } = useI18n()
const store = useReportingStore()

const activeTab = ref('saved')
const filterModule = ref('')
const search = ref('')
const loading = ref(false)

const tabs = [
  { key: 'saved', label: 'Rapports sauvegardés' },
  { key: 'scheduled', label: 'Programmés' },
]

const kpi = computed(() => store.kpi)
const savedReports = computed(() => store.savedReports)
const scheduledReports = computed(() => store.scheduledReports)

function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }

async function load() {
  loading.value = true
  await store.fetchAll({ module: filterModule.value, search: search.value })
  loading.value = false
}

watch([filterModule, search], () => load())
onMounted(() => load())
</script>
