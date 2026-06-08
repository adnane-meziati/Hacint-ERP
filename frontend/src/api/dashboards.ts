import apiClient from './client'

export interface StageLoad {
  code: string
  name: string
  sequence: number
  active_lines: number
}

export interface OPDashboard {
  total_orders: number
  total_lines: number
  lines_en_cours: number
  lines_livree: number
  lines_standby: number
  lines_urgent: number
  orders_late: number
  lines_late: number
  stage_load: StageLoad[]
}

export interface LoadStage {
  code: string
  name: string
  sequence: number
  total: number
  en_cours: number
  urgent: number
}

export const dashboardsApi = {
  op(): Promise<OPDashboard> {
    return apiClient.get('/dashboards/op/').then(r => r.data)
  },

  load(): Promise<LoadStage[]> {
    return apiClient.get('/dashboards/load/').then(r => r.data)
  },
}
