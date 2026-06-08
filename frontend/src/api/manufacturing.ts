import apiClient from './client'

export interface WorkCenter {
  id: string
  code: string
  name: string
  capacity_per_hour: string
  setup_time_minutes: number
  is_active: boolean
}

export interface ManufacturingOrder {
  id: string
  ref: string
  work_center: string
  work_center_code: string
  work_center_name: string
  bom: string | null
  sales_order_line: string | null
  planned_start: string | null
  planned_end: string | null
  actual_start: string | null
  actual_end: string | null
  qty_planned: string
  qty_produced: string
  status: string
  notes: string
}

export interface Routing {
  id: string
  name: string
  work_center: string
  work_center_code: string
  bom: string | null
  sequence: number
  operation_description: string
  standard_time_minutes: number
}

export const manufacturingApi = {
  listOrders: (params = {}) => apiClient.get('/v1/manufacturing/orders/', { params }).then(r => r.data),
  listWorkCenters: (params = {}) => apiClient.get('/v1/manufacturing/work-centers/', { params }).then(r => r.data),
  listRoutings: (params = {}) => apiClient.get('/v1/manufacturing/routings/', { params }).then(r => r.data),
}
