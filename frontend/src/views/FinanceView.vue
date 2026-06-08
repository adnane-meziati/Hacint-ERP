<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold" style="color:var(--text-hi)">{{ t('nav.finance') }}</h1>
      <button class="btn-primary">+ Facture</button>
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
        <p class="text-xs font-medium" style="color:var(--text-lo)">Factures impayées</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--danger)">{{ kpi.unpaidInvoices }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">CA facturu (MAD)</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--accent)">{{ fmtAmount(kpi.totalInvoiced) }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Encaissements (MAD)</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--success)">{{ fmtAmount(kpi.totalPaid) }}</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Solde en attente (MAD)</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--warning)">{{ fmtAmount(kpi.outstanding) }}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <select class="erp-input w-44" v-model="filterStatus">
        <option value="">Tous statuts</option>
        <option value="draft">Brouillon</option>
        <option value="sent">Envoyée</option>
        <option value="paid">Payée</option>
        <option value="overdue">En retard</option>
        <option value="partial">Partielle</option>
        <option value="cancelled">Annulée</option>
      </select>
      <select class="erp-input w-44" v-model="filterType">
        <option value="">Tous types</option>
        <option value="customer">Client</option>
        <option value="vendor">Fournisseur</option>
        <option value="credit_note">Avoir</option>
      </select>
      <input class="erp-input flex-1 min-w-48" v-model="search" placeholder="Rechercher réf facture…" />
    </div>

    <div v-if="activeTab === 'invoices'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Réf</th><th>Type</th><th>Tiers</th><th>Émission</th><th>Échéance</th><th>Montant HT</th><th>Payé</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="8" class="text-center py-8" style="color:var(--text-lo)">Chargement…</td></tr>
          <tr v-else-if="!invoices.length"><td colspan="8" class="text-center py-8" style="color:var(--text-lo)">Aucune facture</td></tr>
          <tr v-for="inv in invoices" :key="inv.id" v-else>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ inv.ref }}</td>
            <td><span :class="inv.invoice_type === 'customer' ? 'pill pill-info' : 'pill pill-neutral'">{{ inv.invoice_type }}</span></td>
            <td style="color:var(--text-hi)">{{ inv.customer_name || inv.vendor_name || '—' }}</td>
            <td style="color:var(--text-md)">{{ fmtDate(inv.issue_date) }}</td>
            <td :style="inv.is_overdue ? 'color:var(--danger)' : 'color:var(--text-md)'">{{ fmtDate(inv.due_date) }}</td>
            <td style="color:var(--text-hi)">{{ fmtAmount(inv.total_amount) }}</td>
            <td style="color:var(--success)">{{ fmtAmount(inv.paid_amount) }}</td>
            <td><span :class="invStatusPill(inv.status)">{{ inv.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'payments'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Date</th><th>Facture</th><th>Montant (MAD)</th><th>Méthode</th><th>Référence</th></tr></thead>
        <tbody>
          <tr v-if="!payments.length"><td colspan="5" class="text-center py-8" style="color:var(--text-lo)">Aucun paiement</td></tr>
          <tr v-for="p in payments" :key="p.id" v-else>
            <td style="color:var(--text-md)">{{ fmtDate(p.payment_date) }}</td>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ p.invoice_ref }}</td>
            <td style="color:var(--success)">{{ fmtAmount(p.amount) }}</td>
            <td><span class="pill pill-neutral">{{ p.payment_method }}</span></td>
            <td class="font-mono text-xs" style="color:var(--text-lo)">{{ p.reference || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'accounts'" class="overflow-x-auto rounded-xl border" style="border-color:var(--border)">
      <table class="erp-table w-full">
        <thead><tr><th>Code</th><th>Nom</th><th>Type</th><th>Devise</th><th>Solde</th></tr></thead>
        <tbody>
          <tr v-if="!accounts.length"><td colspan="5" class="text-center py-8" style="color:var(--text-lo)">Aucun compte</td></tr>
          <tr v-for="a in accounts" :key="a.id" v-else>
            <td class="font-mono font-medium" style="color:var(--accent)">{{ a.code }}</td>
            <td style="color:var(--text-hi)">{{ a.name }}</td>
            <td><span class="pill pill-neutral">{{ a.account_type }}</span></td>
            <td style="color:var(--text-md)">{{ a.currency }}</td>
            <td :style="Number(a.balance) >= 0 ? 'color:var(--success)' : 'color:var(--danger)'">
              {{ fmtAmount(a.balance) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFinanceStore } from '@/stores/finance'

const { t } = useI18n()
const store = useFinanceStore()

const activeTab = ref('invoices')
const filterStatus = ref('')
const filterType = ref('')
const search = ref('')
const loading = ref(false)

const tabs = [
  { key: 'invoices', label: 'Factures' },
  { key: 'payments', label: 'Paiements' },
  { key: 'accounts', label: 'Plan comptable' },
]

const kpi = computed(() => store.kpi)
const invoices = computed(() => store.invoices)
const payments = computed(() => store.payments)
const accounts = computed(() => store.accounts)

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
function fmtAmount(v: number | string) {
  return Number(v).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
}
function invStatusPill(s: string) {
  const map: Record<string, string> = {
    draft: 'pill pill-neutral', sent: 'pill pill-info', paid: 'pill pill-success',
    overdue: 'pill pill-danger', partial: 'pill pill-warning', cancelled: 'pill pill-neutral',
  }
  return map[s] ?? 'pill pill-neutral'
}

async function load() {
  loading.value = true
  await store.fetchAll({ status: filterStatus.value, invoice_type: filterType.value, search: search.value })
  loading.value = false
}

watch([filterStatus, filterType, search], () => load())
onMounted(() => load())
</script>
