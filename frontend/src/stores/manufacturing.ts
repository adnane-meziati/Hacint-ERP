import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { manufacturingApi, type ManufacturingOrder, type WorkCenter, type Routing } from '@/api/manufacturing'

export const useManufacturingStore = defineStore('manufacturing', () => {
  const orders = ref<ManufacturingOrder[]>([])
  const workCenters = ref<WorkCenter[]>([])
  const routings = ref<Routing[]>([])

  const kpi = computed(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    return {
      inProgress: orders.value.filter(o => o.status === 'in_progress').length,
      scheduled: orders.value.filter(o => o.status === 'scheduled').length,
      workCenters: workCenters.value.filter(wc => wc.is_active).length,
      completedThisMonth: orders.value.filter(o =>
        o.status === 'completed' && o.actual_end && new Date(o.actual_end) >= startOfMonth
      ).length,
    }
  })

  async function fetchAll(params: Record<string, string> = {}) {
    const [ordersRes, wcRes, routingsRes] = await Promise.all([
      manufacturingApi.listOrders(params),
      manufacturingApi.listWorkCenters({}),
      manufacturingApi.listRoutings({}),
    ])
    orders.value = ordersRes.results ?? ordersRes
    workCenters.value = wcRes.results ?? wcRes
    routings.value = routingsRes.results ?? routingsRes
  }

  return { orders, workCenters, routings, kpi, fetchAll }
})
