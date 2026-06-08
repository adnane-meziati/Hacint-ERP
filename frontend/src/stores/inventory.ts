import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { inventoryApi, type Item, type StockMovement, type Warehouse } from '@/api/inventory'

export const useInventoryStore = defineStore('inventory', () => {
  const items = ref<Item[]>([])
  const movements = ref<StockMovement[]>([])
  const warehouses = ref<Warehouse[]>([])

  const kpi = computed(() => ({
    totalItems: items.value.filter(i => i.is_active).length,
    lowStockAlerts: items.value.filter(i => i.is_low_stock).length,
    warehouses: warehouses.value.length,
    recentMovements: movements.value.length,
  }))

  async function fetchAll(params: Record<string, string> = {}) {
    const [itemsRes, movementsRes, warehousesRes] = await Promise.all([
      inventoryApi.listItems(params),
      inventoryApi.listMovements({}),
      inventoryApi.listWarehouses({}),
    ])
    items.value = itemsRes.results ?? itemsRes
    movements.value = movementsRes.results ?? movementsRes
    warehouses.value = warehousesRes.results ?? warehousesRes
  }

  return { items, movements, warehouses, kpi, fetchAll }
})
