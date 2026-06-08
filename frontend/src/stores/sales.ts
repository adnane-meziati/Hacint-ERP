import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { salesApi, type Customer, type SalesOrder, type Quote } from '@/api/sales'

export const useSalesStore = defineStore('sales', () => {
  const orders = ref<SalesOrder[]>([])
  const customers = ref<Customer[]>([])
  const quotes = ref<Quote[]>([])
  const total = ref(0)

  const kpi = computed(() => ({
    openOrders: orders.value.filter(o => ['confirmed', 'in_production'].includes(o.status)).length,
    totalAmount: orders.value.reduce((s, o) => s + Number(o.total_amount), 0),
    activeCustomers: customers.value.filter(c => c.status === 'active').length,
    pendingQuotes: quotes.value.filter(q => q.status === 'sent').length,
  }))

  async function fetchAll(params: Record<string, string> = {}) {
    const [ordersRes, customersRes, quotesRes] = await Promise.all([
      salesApi.listOrders(params),
      salesApi.listCustomers({}),
      salesApi.listQuotes({}),
    ])
    orders.value = ordersRes.results ?? ordersRes
    customers.value = customersRes.results ?? customersRes
    quotes.value = quotesRes.results ?? quotesRes
    total.value = ordersRes.count ?? orders.value.length
  }

  return { orders, customers, quotes, total, kpi, fetchAll }
})
