<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold" style="color:var(--text-hi)">{{ t('nav.plm') }}</h1>
      <button class="btn-primary">+ Nomenclature</button>
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
        <p class="text-xs font-medium" style="color:var(--text-lo)">Nomenclatures actives</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--text-hi)">{{ kpi.activeBOMs }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">ECNs en cours</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--warning)">{{ kpi.pendingECNs }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Articles référencés</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--text-hi)">{{ kpi.articles }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Révisions ce mois</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--accent)">{{ kpi.revisionsThisMonth }}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <select class="erp-input w-44" v-model="filterStatus">
        <option value="">Tous statuts</option>
        <option value="draft">Brouillon</option>
        <option value="active">Actif</option>
        <option value="obsolete">Obsolète</option>
      </select>
      <input class="erp-input flex-1 min-w-48" v-model="search" placeholder="Rechercher article, révision…" />
    </div>

    <div v-if="activeTab === 'boms'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Article</th><th>Révision</th><th>Lignes</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="4" class="text-center py-8" style="color:var(--text-lo)">Chargement…</td></tr>
          <tr v-else-if="!boms.length"><td colspan="4" class="text-center py-8" style="color:var(--text-lo)">Aucune nomenclature</td></tr>
          <tr v-for="b in boms" :key="b.id" v-else>
            <td style="color:var(--text-hi)">{{ b.article_ref }}</td>
            <td class="font-mono" style="color:var(--accent)">Rev {{ b.revision }}</td>
            <td style="color:var(--text-md)">{{ b.line_count }}</td>
            <td><span :class="bomStatusPill(b.status)">{{ b.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'ecns'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Réf ECN</th><th>Titre</th><th>Priorité</th><th>Demandeur</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-if="!ecns.length"><td colspan="5" class="text-center py-8" style="color:var(--text-lo)">Aucun ECN</td></tr>
          <tr v-for="e in ecns" :key="e.id" v-else>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ e.ref }}</td>
            <td style="color:var(--text-hi)">{{ e.title }}</td>
            <td><span :class="priorityPill(e.priority)">{{ e.priority }}</span></td>
            <td style="color:var(--text-md)">{{ e.requested_by_name }}</td>
            <td><span :class="ecnStatusPill(e.status)">{{ e.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlmStore } from '@/stores/plm'

const { t } = useI18n()
const store = usePlmStore()

const activeTab = ref('boms')
const filterStatus = ref('')
const search = ref('')
const loading = ref(false)

const tabs = [
  { key: 'boms', label: 'Nomenclatures' },
  { key: 'ecns', label: 'ECN' },
  { key: 'articles', label: 'Articles' },
]

const kpi = computed(() => store.kpi)
const boms = computed(() => store.boms)
const ecns = computed(() => store.ecns)

function bomStatusPill(s: string) {
  const map: Record<string, string> = { draft: 'pill pill-neutral', active: 'pill pill-success', obsolete: 'pill pill-danger' }
  return map[s] ?? 'pill pill-neutral'
}
function priorityPill(p: string) {
  const map: Record<string, string> = {
    low: 'pill pill-neutral', medium: 'pill pill-info',
    high: 'pill pill-warning', critical: 'pill pill-danger',
  }
  return map[p] ?? 'pill pill-neutral'
}
function ecnStatusPill(s: string) {
  const map: Record<string, string> = {
    draft: 'pill pill-neutral', under_review: 'pill pill-warning',
    approved: 'pill pill-success', rejected: 'pill pill-danger', implemented: 'pill pill-accent',
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
