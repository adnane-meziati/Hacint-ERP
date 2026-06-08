import apiClient from './client'

export interface OrderLine {
  id: string
  n_serie: number
  article: string
  article_ref: string
  article_desc: string
  quantity: number
  priority: string
  status: string
  current_stage_code: string | null
  comments: string
  events: StageEvent[]
}

export interface StageEvent {
  id: string
  stage_code: string
  stage_name: string
  stage_sequence: number
  status: string
  started_at: string | null
  completed_at: string | null
  completed_by_username: string | null
  comment: string
}

export interface Order {
  id: string
  n_ordre: number
  client: string
  client_code: string
  creation_date: string
  delivery_date: string
  status: string
  notes: string
  line_count: number
  created_at: string
}

export interface OrderDetail extends Order {
  lines: OrderLine[]
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface OrderFilters {
  status?: string
  client?: string
  priority?: string
  family?: string
  from_date?: string
  to_date?: string
  search?: string
  ordering?: string
  page?: number
  page_size?: number
}

export interface CreateOrderLinePayload {
  n_serie: number
  article: string
  quantity: number
  priority: string
  comments?: string
}

export interface CreateOrderPayload {
  n_ordre: number
  client: string
  creation_date: string
  delivery_date: string
  notes?: string
  lines: CreateOrderLinePayload[]
}

export const ordersApi = {
  list(filters: OrderFilters = {}): Promise<PaginatedResponse<Order>> {
    return apiClient.get('/orders/', { params: filters }).then(r => r.data)
  },

  get(id: string): Promise<OrderDetail> {
    return apiClient.get(`/orders/${id}/`).then(r => r.data)
  },

  create(payload: CreateOrderPayload): Promise<OrderDetail> {
    return apiClient.post('/orders/', payload).then(r => r.data)
  },

  patch(id: string, payload: Partial<Order>): Promise<OrderDetail> {
    return apiClient.patch(`/orders/${id}/`, payload).then(r => r.data)
  },

  pdfUrl(id: string): string {
    return `${apiClient.defaults.baseURL}/orders/${id}/pdf`
  },

  getLine(id: string): Promise<OrderLine> {
    return apiClient.get(`/lines/${id}/`).then(r => r.data)
  },

  patchLine(id: string, payload: Partial<OrderLine>): Promise<OrderLine> {
    return apiClient.patch(`/production/lines/${id}/`, payload).then(r => r.data)
  },

  sendToStage(lineId: string, stageCode: string): Promise<{ detail: string; line_id: string }> {
    return apiClient.post(`/production/lines/${lineId}/send-to/`, { stage_code: stageCode }).then(r => r.data)
  },
}

export const stagesApi = {
  start(lineId: string, stageCode: string): Promise<StageEvent> {
    return apiClient.post(`/production/lines/${lineId}/stages/${stageCode}/start`).then(r => r.data)
  },

  complete(lineId: string, stageCode: string, comment = ''): Promise<StageEvent> {
    return apiClient.post(`/production/lines/${lineId}/stages/${stageCode}/complete`, { comment }).then(r => r.data)
  },

  block(lineId: string, stageCode: string, comment = ''): Promise<StageEvent> {
    return apiClient.post(`/production/lines/${lineId}/stages/${stageCode}/block`, { comment }).then(r => r.data)
  },

  queue(stageCode: string): Promise<QueueLine[]> {
    return apiClient.get(`/queues/${stageCode}/`).then(r => r.data)
  },
}

export interface QueueLine {
  id: string
  n_serie: number
  order_n_ordre: number
  client_code: string
  article_ref: string
  article_desc: string
  quantity: number
  priority: string
  status: string
  current_stage_code: string | null
  stage_event_id: string | null
  stage_event_status: string | null
  stage_event_comment: string | null
  sort_order: number
}

export const exportsApi = {
  opXlsxUrl(fromDate?: string, toDate?: string): string {
    const params = new URLSearchParams()
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    const qs = params.toString()
    return `${apiClient.defaults.baseURL}/exports/op.xlsx${qs ? '?' + qs : ''}`
  },
}

export const importsApi = {
  async uploadOp(file: File): Promise<{ detail: string; log: string }> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await apiClient.post('/imports/op/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
}
