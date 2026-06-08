<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold" style="color:var(--text-hi)">{{ t('nav.dashboard') }}</h1>
        <p class="text-sm mt-0.5" style="color:var(--text-lo)">HACINT ERP — Tableau de bord</p>
      </div>
      <span class="text-xs" style="color:var(--text-lo)">Mis à jour {{ now }}</span>
    </div>

    <!-- Row 1: Global KPI cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Commandes ouvertes</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--text-hi)">{{ kpi.openSalesOrders }}</p>
        <p class="text-xs mt-1" style="color:var(--text-lo)">Commandes clients confirmées</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">En production</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--warning)">{{ kpi.inProduction }}</p>
        <p class="text-xs mt-1" style="color:var(--text-lo)">Ordres de fabrication actifs</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Alertes stock bas</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--danger)">{{ kpi.lowStockAlerts }}</p>
        <p class="text-xs mt-1" style="color:var(--text-lo)">Articles sous seuil réappro</p>
      </div>
      <div class="kpi-card">
        <p class="text-xs font-medium" style="color:var(--text-lo)">Facturé ce mois (MAD)</p>
        <p class="text-3xl font-bold mt-1" style="color:var(--accent)">{{ fmtAmount(kpi.revenueMTD) }}</p>
        <p class="text-xs mt-1" style="color:var(--text-lo)">Chiffre d'affaires facturé</p>
      </div>
    </div>

    <!-- Row 2: Production chart + Module health -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Production output bar chart -->
      <div class="lg:col-span-2 rounded-xl border p-5" style="border-color:var(--border);background:var(--bg-surface)">
        <h2 class="text-sm font-semibold mb-4" style="color:var(--text-hi)">Charge par atelier CNC</h2>
        <div v-if="opLoading" class="h-32 flex items-center justify-center" style="color:var(--text-lo)">
          Chargement…
        </div>
        <div v-else-if="opData" class="flex gap-2 items-end h-32">
          <div v-for="stage in opData.stage_load" :key="stage.code" class="flex flex-col items-center flex-1">
            <span class="text-xs mb-1" style="color:var(--text-md)">{{ stage.active_lines }}</span>
            <div
              class="w-full rounded-t transition-all"
              style="background:var(--accent)"
              :style="{ height: `${Math.max(6, (stage.active_lines / maxLoad) * 100)}%`, opacity: 0.8 }"
            />
            <span class="text-xs mt-1 font-mono" style="color:var(--text-lo)">{{ stage.code }}</span>
          </div>
        </div>
        <div v-else class="h-32 flex items-center justify-center text-xs" style="color:var(--text-lo)">
          Aucune donnée de production
        </div>
      </div>

      <!-- Module health panel -->
      <div class="rounded-xl border p-5" style="border-color:var(--border);background:var(--bg-surface)">
        <h2 class="text-sm font-semibold mb-4" style="color:var(--text-hi)">Santé des modules</h2>
        <div class="grid grid-cols-3 gap-2">
          <router-link
            v-for="mod in moduleHealth"
            :key="mod.key"
            :to="mod.path"
            class="flex flex-col items-center rounded-lg p-2 transition-colors hover:opacity-80"
            style="background:var(--bg-elevated)"
          >
            <div class="w-2 h-2 rounded-full mb-1" :style="{ background: mod.color }" />
            <span class="text-lg font-bold" style="color:var(--text-hi)">{{ mod.count }}</span>
            <span class="text-xs text-center leading-tight" style="color:var(--text-lo)">{{ mod.label }}</span>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Row 3: Recent orders + Active alerts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Recent CNC orders table -->
      <div class="rounded-xl border overflow-hidden" style="border-color:var(--border);background:var(--bg-surface)">
        <div class="px-5 py-3 border-b flex items-center justify-between" style="border-color:var(--border)">
          <h2 class="text-sm font-semibold" style="color:var(--text-hi)">Dernières commandes CNC</h2>
          <router-link to="/orders" class="text-xs" style="color:var(--accent)">Voir tout →</router-link>
        </div>
        <table class="erp-table w-full">
          <thead>
            <tr>
              <th>N°</th>
              <th>Client</th>
              <th>Lignes</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="opLoading"><td colspan="4" class="text-center py-6" style="color:var(--text-lo)">Chargement…</td></tr>
            <tr v-else-if="!recentOrders.length"><td colspan="4" class="text-center py-6" style="color:var(--text-lo)">Aucune commande récente</td></tr>
            <tr v-for="o in recentOrders" :key="o.n_ordre" v-else>
              <td class="font-mono font-medium" style="color:var(--accent)">{{ o.n_ordre }}</td>
              <td style="color:var(--text-hi)">{{ o.client_code }}</td>
              <td style="color:var(--text-md)">{{ o.line_count }}</td>
              <td>
                <span v-if="o.is_late" class="pill pill-danger">En retard</span>
                <span v-else-if="o.en_cours > 0" class="pill pill-warning">En cours</span>
                <span v-else class="pill pill-success">OK</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Active alerts -->
      <div class="rounded-xl border overflow-hidden" style="border-color:var(--border);background:var(--bg-surface)">
        <div class="px-5 py-3 border-b" style="border-color:var(--border)">
          <h2 class="text-sm font-semibold" style="color:var(--text-hi)">Alertes actives</h2>
        </div>
        <div class="divide-y" style="--tw-divide-opacity:1;border-color:var(--border)">
          <div v-if="!alerts.length" class="px-5 py-8 text-center text-xs" style="color:var(--text-lo)">
            Aucune alerte active
          </div>
          <div v-for="alert in alerts" :key="alert.id" class="px-5 py-3 flex items-start gap-3">
            <div class="w-2 h-2 rounded-full mt-1 flex-shrink-0"
              :style="{ background: alert.level === 'danger' ? 'var(--danger)' : alert.level === 'warning' ? 'var(--warning)' : 'var(--info)' }" />
            <div>
              <p class="text-sm font-medium" style="color:var(--text-hi)">{{ alert.title }}</p>
              <p class="text-xs mt-0.5" style="color:var(--text-lo)">{{ alert.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { dashboardsApi, type OPDashboard } from '@/api/dashboards'

const { t } = useI18n()

const opData = ref<OPDashboard | null>(null)
const opLoading = ref(true)
const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const maxLoad = computed(() =>
  Math.max(1, ...((opData.value?.stage_load ?? []).map((s: any) => s.active_lines)))
)

const recentOrders = computed(() => {
  if (!opData.value) return []
  return (opData.value as any).recent_orders ?? []
})

// KPI derived from op dashboard data
const kpi = computed(() => ({
  openSalesOrders: (opData.value as any)?.open_sales_orders ?? (opData.value?.total_orders ?? 0),
  inProduction: opData.value?.lines_en_cours ?? 0,
  lowStockAlerts: (opData.value as any)?.low_stock_alerts ?? 0,
  revenueMTD: (opData.value as any)?.revenue_mtd ?? 0,
}))

const moduleHealth = [
  { key: 'sales', label: 'Ventes', path: '/sales', count: 0, color: 'var(--success)' },
  { key: 'purchase', label: 'Achats', path: '/purchase', count: 0, color: 'var(--success)' },
  { key: 'inventory', label: 'Stock', path: '/inventory', count: 0, color: 'var(--warning)' },
  { key: 'manufacturing', label: 'Prod.', path: '/manufacturing', count: 0, color: 'var(--accent)' },
  { key: 'quality', label: 'Qualité', path: '/quality', count: 0, color: 'var(--success)' },
  { key: 'plm', label: 'PLM', path: '/plm', count: 0, color: 'var(--success)' },
  { key: 'hr', label: 'RH', path: '/hr', count: 0, color: 'var(--success)' },
  { key: 'finance', label: 'Finance', path: '/finance', count: 0, color: 'var(--warning)' },
  { key: 'reporting', label: 'Rapports', path: '/reporting', count: 0, color: 'var(--info)' },
]

interface Alert {
  id: string
  level: 'danger' | 'warning' | 'info'
  title: string
  body: string
}

const alerts = ref<Alert[]>([])

function fmtAmount(v: number) {
  if (!v) return '0'
  return v.toLocaleString('fr-MA', { maximumFractionDigits: 0 })
}

onMounted(async () => {
  try {
    opData.value = await dashboardsApi.op()

    // Build alerts from dashboard data
    const d = opData.value as any
    if (d?.orders_late > 0) {
      alerts.value.push({
        id: 'late-orders',
        level: 'danger',
        title: `${d.orders_late} commande(s) en retard`,
        body: 'Des commandes CNC ont dépassé leur date de livraison prévue.',
      })
    }
    if (d?.lines_standby > 0) {
      alerts.value.push({
        id: 'standby',
        level: 'warning',
        title: `${d.lines_standby} ligne(s) en attente`,
        body: 'Des lignes de production sont bloquées en standby.',
      })
    }
  } catch {
    // Dashboard may not be seeded yet
  } finally {
    opLoading.value = false
  }
})
</script>
