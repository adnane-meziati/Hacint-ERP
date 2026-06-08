import apiClient from './client'

export interface SavedReport {
  id: string
  name: string
  description: string
  module: string
  query_params: Record<string, unknown>
  is_public: boolean
  created_by: string
}

export interface ScheduledReport {
  id: string
  saved_report: string
  saved_report_name: string
  schedule_cron: string
  recipients_emails: string
  last_run: string | null
  next_run: string | null
  is_active: boolean
}

export const reportingApi = {
  listSaved: (params = {}) => apiClient.get('/v1/reporting/saved/', { params }).then(r => r.data),
  listScheduled: (params = {}) => apiClient.get('/v1/reporting/scheduled/', { params }).then(r => r.data),
}
