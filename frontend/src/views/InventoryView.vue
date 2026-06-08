<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold" style="color:var(--text-hi)">{{ t('nav.inventory') }}</h1>
      <button class="btn-primary">+ Article</button>
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
        <p class="text-xs font-medium" style="color:var(--text-lo)">Articles actifs</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--text-hi)">{{ kpi.totalItems }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Alertes stock bas</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--danger)">{{ kpi.lowStockAlerts }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Entrepôts</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--text-hi)">{{ kpi.warehouses }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Mouvements (30j)</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--accent)">{{ kpi.recentMovements }}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <select class="erp-input w-44" v-model="filterCategory">
        <option value="">Toutes catégories</option>
        <option value="Wire">Câblerie</option>
        <option value="Connector">Connecteurs</option>
        <option value="Terminal">Terminaux</option>
        <option value="Consumable">Consommables</option>
      </select>
      <input class="erp-input flex-1 min-w-48" v-model="search" placeholder="Rechercher SKU, nom…" />
    </div>

    <div v-if="activeTab === 'items'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>SKU</th><th>Désignation</th><th>Catégorie</th><th>U.M.</th><th>Stock actuel</th><th>Seuil réappro</th><th>État</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="text-center py-8" style="color:var(--text-lo)">Chargement…</td></tr>
          <tr v-else-if="!items.length"><td colspan="7" class="text-center py-8" style="color:var(--text-lo)">Aucun article</td></tr>
          <tr v-for="item in items" :key="item.id" v-else>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ item.sku }}</td>
            <td style="color:var(--text-hi)">{{ item.name }}</td>
            <td style="color:var(--text-md)">{{ item.category }}</td>
            <td style="color:var(--text-md)">{{ item.unit_of_measure }}</td>
            <td :style="item.is_low_stock ? 'color:var(--danger)' : 'color:var(--success)'">
              {{ item.current_stock }}
            </td>
            <td style="color:var(--text-md)">{{ item.reorder_point }}</td>
            <td>
              <span v-if="item.is_low_stock" class="pill pill-danger">Stock bas</span>
              <span v-else class="pill pill-success">OK</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'movements'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Date</th><th>Article</th><th>Type</th><th>Qté</th><th>De</th><th>Vers</th><th>Référence</th></tr></thead>
        <tbody>
          <tr v-if="!movements.length"><td colspan="7" class="text-center py-8" style="color:var(--text-lo)">Aucun mouvement</td></tr>
          <tr v-for="m in movements" :key="m.id" v-else>
            <td style="color:var(--text-md)">{{ fmtDate(m.created_at) }}</td>
            <td style="color:var(--text-hi)">{{ m.item_sku }}</td>
            <td><span :class="movePill(m.movement_type)">{{ m.movement_type }}</span></td>
            <td style="color:var(--text-hi)">{{ m.qty }}</td>
            <td style="color:var(--text-md)">{{ m.from_location_name || '—' }}</td>
            <td style="color:var(--text-md)">{{ m.to_location_name || '—' }}</td>
            <td class="font-mono text-xs" style="color:var(--text-lo)">{{ m.reference }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInventoryStore } from '@/stores/inventory'

const { t } = useI18n()
const store = useInventoryStore()

const activeTab = ref('items')
const filterCategory = ref('')
const search = ref('')
const loading = ref(false)

const tabs = [
  { key: 'items', label: 'Articles' },
  { key: 'stock', label: 'Stock' },
  { key: 'movements', label: 'Mouvements' },
]

const kpi = computed(() => store.kpi)
const items = computed(() => store.items)
const movements = computed(() => store.movements)

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
function movePill(t: string) {
  const map: Record<string, string> = {
    receipt: 'pill pill-success', issue: 'pill pill-warning',
    transfer: 'pill pill-info', adjustment: 'pill pill-neutral',
  }
  return map[t] ?? 'pill pill-neutral'
}

async function load() {
  loading.value = true
  await store.fetchAll({ category: filterCategory.value, search: search.value })
  loading.value = false
}

watch([filterCategory, search], () => load())
onMounted(() => load())
</script>
