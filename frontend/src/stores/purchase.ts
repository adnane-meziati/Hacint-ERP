import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { purchaseApi, type PurchaseOrder, type Vendor } from '@/api/purchase'

export const usePurchaseStore = defineStore('purchase', () => {
  const orders = ref<PurchaseOrder[]>([])
  const vendors = ref<Vendor[]>([])
  const rfqs = ref<unknown[]>([])

  const kpi = computed(() => ({
    openPOs: orders.value.filter(o => ['confirmed', 'partial'].includes(o.status)).length,
    totalCommitted: orders.value.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount), 0),
    activeVendors: vendors.value.filter(v => v.status === 'active').length,
    openRFQs: rfqs.value.length,
  }))

  async function fetchAll(params: Record<string, string> = {}) {
    const [ordersRes, vendorsRes, rfqsRes] = await Promise.all([
      purchaseApi.listOrders(params),
      purchaseApi.listVendors({}),
      purchaseApi.listRFQs({}),
    ])
    orders.value = ordersRes.results ?? ordersRes
    vendors.value = vendorsRes.results ?? vendorsRes
    rfqs.value = rfqsRes.results ?? rfqsRes
  }

  return { orders, vendors, rfqs, kpi, fetchAll }
})
