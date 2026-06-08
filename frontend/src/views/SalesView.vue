<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold" style="color:var(--text-hi)">{{ t('nav.sales') }}</h1>
      <button class="btn-primary" @click="showNew = true">+ Nouveau</button>
    </div>

    <!-- Tabs -->
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

    <!-- KPI row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Commandes ouvertes</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--text-hi)">{{ kpi.openOrders }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Montant total (MAD)</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--accent)">{{ fmtAmount(kpi.totalAmount) }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Clients actifs</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--text-hi)">{{ kpi.activeCustomers }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Devis en attente</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--warning)">{{ kpi.pendingQuotes }}</p>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="flex flex-wrap gap-3">
      <select class="erp-input w-44" v-model="filterStatus">
        <option value="">Tous statuts</option>
        <option value="draft">Brouillon</option>
        <option value="confirmed">Confirmé</option>
        <option value="in_production">En production</option>
        <option value="shipped">Expédié</option>
        <option value="delivered">Livré</option>
        <option value="cancelled">Annulé</option>
      </select>
      <input class="erp-input flex-1 min-w-48" v-model="search" placeholder="Rechercher ref, client…" />
    </div>

    <!-- Orders table -->
    <div v-if="activeTab === 'orders'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead>
          <tr>
            <th>Réf commande</th>
            <th>Client</th>
            <th>Date livraison</th>
            <th>Montant (MAD)</th>
            <th>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="6" class="text-center py-8" style="color:var(--text-lo)">Chargement…</td></tr>
          <tr v-else-if="!orders.length"><td colspan="6" class="text-center py-8" style="color:var(--text-lo)">Aucune commande trouvée</td></tr>
          <tr v-for="o in orders" :key="o.id" v-else>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ o.ref }}</td>
            <td style="color:var(--text-hi)">{{ o.customer_name }}</td>
            <td style="color:var(--text-md)">{{ fmtDate(o.delivery_date) }}</td>
            <td style="color:var(--text-hi)">{{ fmtAmount(o.total_amount) }}</td>
            <td><span :class="statusPill(o.status)">{{ statusLabel(o.status) }}</span></td>
            <td><button class="text-xs" style="color:var(--accent)" @click="selectedId = o.id">Voir</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Customers table -->
    <div v-if="activeTab === 'customers'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Code</th><th>Nom</th><th>Pays</th><th>Email</th><th>Plafond crédit</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-if="!customers.length"><td colspan="6" class="text-center py-8" style="color:var(--text-lo)">Aucun client</td></tr>
          <tr v-for="c in customers" :key="c.id" v-else>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ c.code }}</td>
            <td style="color:var(--text-hi)">{{ c.name }}</td>
            <td style="color:var(--text-md)">{{ c.country }}</td>
            <td style="color:var(--text-md)">{{ c.contact_email }}</td>
            <td style="color:var(--text-hi)">{{ fmtAmount(c.credit_limit) }}</td>
            <td><span :class="c.status === 'active' ? 'pill pill-success' : 'pill pill-neutral'">{{ c.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSalesStore } from '@/stores/sales'

const { t } = useI18n()
const store = useSalesStore()

const activeTab = ref('orders')
const filterStatus = ref('')
const search = ref('')
const loading = ref(false)
const showNew = ref(false)
const selectedId = ref<string | null>(null)

const tabs = [
  { key: 'orders', label: 'Commandes' },
  { key: 'quotes', label: 'Devis' },
  { key: 'customers', label: 'Clients' },
]

const kpi = computed(() => store.kpi)
const orders = computed(() => store.orders)
const customers = computed(() => store.customers)

function fmtAmount(v: number | string) {
  return Number(v).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
}
function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}
function statusPill(s: string) {
  const map: Record<string, string> = {
    draft: 'pill pill-neutral', confirmed: 'pill pill-info',
    in_production: 'pill pill-warning', shipped: 'pill pill-accent',
    delivered: 'pill pill-success', cancelled: 'pill pill-danger',
  }
  return map[s] ?? 'pill pill-neutral'
}
function statusLabel(s: string) {
  const map: Record<string, string> = {
    draft: 'Brouillon', confirmed: 'Confirmé', in_production: 'En production',
    shipped: 'Expédié', delivered: 'Livré', cancelled: 'Annulé',
  }
  return map[s] ?? s
}

async function load() {
  loading.value = true
  await store.fetchAll({ status: filterStatus.value, search: search.value })
  loading.value = false
}

watch([filterStatus, search], () => load())
onMounted(() => load())
</script>
