<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold" style="color:var(--text-hi)">{{ t('nav.manufacturing') }}</h1>
      <button class="btn-primary">+ Ordre de fabrication</button>
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
        <p class="text-xs font-medium" style="color:var(--text-lo)">OF en cours</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--text-hi)">{{ kpi.inProgress }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">OF planifiés</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--info)">{{ kpi.scheduled }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Centres de travail</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--text-hi)">{{ kpi.workCenters }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Complétés ce mois</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--success)">{{ kpi.completedThisMonth }}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <select class="erp-input w-44" v-model="filterStatus">
        <option value="">Tous statuts</option>
        <option value="draft">Brouillon</option>
        <option value="scheduled">Planifié</option>
        <option value="in_progress">En cours</option>
        <option value="completed">Terminé</option>
        <option value="cancelled">Annulé</option>
      </select>
      <input class="erp-input flex-1 min-w-48" v-model="search" placeholder="Rechercher réf OF…" />
    </div>

    <div v-if="activeTab === 'orders'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Réf OF</th><th>Centre de travail</th><th>Début prévu</th><th>Fin prévue</th><th>Qté planifiée</th><th>Qté produite</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="text-center py-8" style="color:var(--text-lo)">Chargement…</td></tr>
          <tr v-else-if="!orders.length"><td colspan="7" class="text-center py-8" style="color:var(--text-lo)">Aucun ordre de fabrication</td></tr>
          <tr v-for="o in orders" :key="o.id" v-else>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ o.ref }}</td>
            <td style="color:var(--text-hi)">{{ o.work_center_name }}</td>
            <td style="color:var(--text-md)">{{ fmtDate(o.planned_start) }}</td>
            <td style="color:var(--text-md)">{{ fmtDate(o.planned_end) }}</td>
            <td style="color:var(--text-hi)">{{ o.qty_planned }}</td>
            <td :style="Number(o.qty_produced) >= Number(o.qty_planned) ? 'color:var(--success)' : 'color:var(--text-hi)'">
              {{ o.qty_produced }}
            </td>
            <td><span :class="moStatusPill(o.status)">{{ o.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'workcenters'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Code</th><th>Nom</th><th>Capacité/h</th><th>Préparation (min)</th><th>Actif</th></tr></thead>
        <tbody>
          <tr v-if="!workCenters.length"><td colspan="5" class="text-center py-8" style="color:var(--text-lo)">Aucun centre de travail</td></tr>
          <tr v-for="wc in workCenters" :key="wc.id" v-else>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ wc.code }}</td>
            <td style="color:var(--text-hi)">{{ wc.name }}</td>
            <td style="color:var(--text-md)">{{ wc.capacity_per_hour }}</td>
            <td style="color:var(--text-md)">{{ wc.setup_time_minutes }}</td>
            <td><span :class="wc.is_active ? 'pill pill-success' : 'pill pill-neutral'">{{ wc.is_active ? 'Oui' : 'Non' }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useManufacturingStore } from '@/stores/manufacturing'

const { t } = useI18n()
const store = useManufacturingStore()

const activeTab = ref('orders')
const filterStatus = ref('')
const search = ref('')
const loading = ref(false)

const tabs = [
  { key: 'orders', label: 'Ordres de fabrication' },
  { key: 'workcenters', label: 'Centres de travail' },
  { key: 'routings', label: 'Gammes' },
]

const kpi = computed(() => store.kpi)
const orders = computed(() => store.orders)
const workCenters = computed(() => store.workCenters)

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
function moStatusPill(s: string) {
  const map: Record<string, string> = {
    draft: 'pill pill-neutral', scheduled: 'pill pill-info',
    in_progress: 'pill pill-warning', completed: 'pill pill-success', cancelled: 'pill pill-danger',
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
