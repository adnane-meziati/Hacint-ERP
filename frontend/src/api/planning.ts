import apiClient from './client'

export interface WeekSlot {
  week: string        // "2026-W19"
  label: string       // "04/05 – 10/05"
  start: string       // ISO date
  end: string         // ISO date
  total: number
  [stageCode: string]: number | string
}

export interface WeeklyCapacity {
  weeks: WeekSlot[]
  stages: string[]
}

export interface GanttEvent {
  stage: string
  stage_name: string
  sequence: number
  status: 'pending' | 'in_progress' | 'done' | 'blocked'
  started_at: string | null
  completed_at: string | null
  completed_by: string | null
  comment: string
}

export interface GanttLine {
  id: string
  n_serie: number
  order_n_ordre: number
  order_id: string
  client_code: string
  article_ref: string
  article_desc: string
  priority: string
  status: string
  delivery_date: string
  current_stage: string | null
  sort_order: number
  events: GanttEvent[]
}

export interface ReorderPayload {
  stage_code: string
  line_ids: string[]
}

export const planningApi = {
  weekly(weeks = 4): Promise<WeeklyCapacity> {
    return apiClient.get('/planning/weekly/', { params: { weeks } }).then(r => r.data)
  },

  gantt(params: {
    stage?: string
    from?: string
    to?: string
    limit?: number
  } = {}): Promise<GanttLine[]> {
    return apiClient.get('/planning/gantt/', { params }).then(r => r.data)
  },

  reorder(payload: ReorderPayload): Promise<{ detail: string; count: number }> {
    return apiClient.post('/planning/reorder/', payload).then(r => r.data)
  },
}
