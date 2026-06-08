import apiClient from './client'

export interface Item {
  id: string
  sku: string
  name: string
  category: string
  unit_of_measure: string
  reorder_point: string
  lead_time_days: number
  unit_cost: string
  is_active: boolean
  current_stock: string
  is_low_stock: boolean
}

export interface StockMovement {
  id: string
  item: string
  item_sku: string
  from_location: string | null
  from_location_name: string | null
  to_location: string | null
  to_location_name: string | null
  qty: string
  movement_type: string
  reference: string
  notes: string
  created_at: string
}

export interface Warehouse {
  id: string
  code: string
  name: string
  address: string
  is_active: boolean
}

export const inventoryApi = {
  listItems: (params = {}) => apiClient.get('/v1/inventory/items/', { params }).then(r => r.data),
  listMovements: (params = {}) => apiClient.get('/v1/inventory/movements/', { params }).then(r => r.data),
  listWarehouses: (params = {}) => apiClient.get('/v1/inventory/warehouses/', { params }).then(r => r.data),
  listLocations: (params = {}) => apiClient.get('/v1/inventory/locations/', { params }).then(r => r.data),
}
