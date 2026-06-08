import { ref } from 'vue'
import { defineStore } from 'pinia'
import { ordersApi, type Order, type OrderDetail, type OrderFilters, type CreateOrderPayload } from '@/api/orders'

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const currentOrder = ref<OrderDetail | null>(null)
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchOrders(filters: OrderFilters = {}) {
    loading.value = true
    error.value = null
    try {
      const res = await ordersApi.list(filters)
      orders.value = res.results
      total.value = res.count
    } catch (e: any) {
      error.value = e?.response?.data?.detail ?? 'Failed to load orders'
    } finally {
      loading.value = false
    }
  }

  async function fetchOrder(id: string) {
    loading.value = true
    error.value = null
    try {
      currentOrder.value = await ordersApi.get(id)
    } catch (e: any) {
      error.value = e?.response?.data?.detail ?? 'Failed to load order'
    } finally {
      loading.value = false
    }
  }

  async function createOrder(payload: CreateOrderPayload): Promise<OrderDetail | null> {
    loading.value = true
    error.value = null
    try {
      const order = await ordersApi.create(payload)
      return order
    } catch (e: any) {
      const data = e?.response?.data
      if (typeof data === 'object' && data !== null) {
        // Flatten all validation errors into one readable string
        const messages: string[] = []
        const flatten = (obj: any, prefix = '') => {
          for (const key in obj) {
            const val = obj[key]
            const label = prefix ? `${prefix}.${key}` : key
            if (Array.isArray(val)) messages.push(`${label}: ${val.join(', ')}`)
            else if (typeof val === 'object') flatten(val, label)
            else messages.push(`${label}: ${val}`)
          }
        }
        flatten(data)
        error.value = messages.join(' | ') || 'Failed to create order'
      } else {
        error.value = 'Failed to create order'
      }
      return null
    } finally {
      loading.value = false
    }
  }

  function clearCurrent() {
    currentOrder.value = null
  }

  return { orders, currentOrder, total, loading, error, fetchOrders, fetchOrder, createOrder, clearCurrent }
})
