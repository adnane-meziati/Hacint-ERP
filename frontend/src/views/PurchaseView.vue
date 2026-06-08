<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold" style="color:var(--text-hi)">{{ t('nav.purchase') }}</h1>
      <button class="btn-primary">+ Nouveau</button>
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
        <p class="text-xs font-medium" style="color:var(--text-lo)">Commandes en cours</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--text-hi)">{{ kpi.openPOs }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Montant engagé (MAD)</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--accent)">{{ fmtAmount(kpi.totalCommitted) }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Fournisseurs actifs</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--text-hi)">{{ kpi.activeVendors }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">RFQs ouverts</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--warning)">{{ kpi.openRFQs }}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <select class="erp-input w-44" v-model="filterStatus">
        <option value="">Tous statuts</option>
        <option value="draft">Brouillon</option>
        <option value="confirmed">Confirmé</option>
        <option value="partial">Partiel</option>
        <option value="received">Reçu</option>
        <option value="cancelled">Annulé</option>
      </select>
      <input class="erp-input flex-1 min-w-48" v-model="search" placeholder="Rechercher ref, fournisseur…" />
    </div>

    <div v-if="activeTab === 'orders'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Réf BC</th><th>Fournisseur</th><th>Date attendue</th><th>Montant (MAD)</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="5" class="text-center py-8" style="color:var(--text-lo)">Chargement…</td></tr>
          <tr v-else-if="!orders.length"><td colspan="5" class="text-center py-8" style="color:var(--text-lo)">Aucune commande</td></tr>
          <tr v-for="o in orders" :key="o.id" v-else>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ o.ref }}</td>
            <td style="color:var(--text-hi)">{{ o.vendor_name }}</td>
            <td style="color:var(--text-md)">{{ fmtDate(o.expected_date) }}</td>
            <td style="color:var(--text-hi)">{{ fmtAmount(o.total_amount) }}</td>
            <td><span :class="statusPill(o.status)">{{ o.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'vendors'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Code</th><th>Nom</th><th>Pays</th><th>Délai paiement</th><th>Devise</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-if="!vendors.length"><td colspan="6" class="text-center py-8" style="color:var(--text-lo)">Aucun fournisseur</td></tr>
          <tr v-for="v in vendors" :key="v.id" v-else>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ v.code }}</td>
            <td style="color:var(--text-hi)">{{ v.name }}</td>
            <td style="color:var(--text-md)">{{ v.country }}</td>
            <td style="color:var(--text-md)">{{ v.payment_terms }}</td>
            <td style="color:var(--text-md)">{{ v.currency }}</td>
            <td><span :class="v.status === 'active' ? 'pill pill-success' : 'pill pill-neutral'">{{ v.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePurchaseStore } from '@/stores/purchase'

const { t } = useI18n()
const store = usePurchaseStore()

const activeTab = ref('orders')
const filterStatus = ref('')
const search = ref('')
const loading = ref(false)

const tabs = [
  { key: 'orders', label: 'Bons de commande' },
  { key: 'rfqs', label: 'Appels d\'offre' },
  { key: 'vendors', label: 'Fournisseurs' },
]

const kpi = computed(() => store.kpi)
const orders = computed(() => store.orders)
const vendors = computed(() => store.vendors)

function fmtAmount(v: number | string) {
  return Number(v).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
}
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
function statusPill(s: string) {
  const map: Record<string, string> = {
    draft: 'pill pill-neutral', confirmed: 'pill pill-info',
    partial: 'pill pill-warning', received: 'pill pill-success', cancelled: 'pill pill-danger',
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
