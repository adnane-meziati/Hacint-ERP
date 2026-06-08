import apiClient from './client'

export interface BOM {
  id: string
  article: string
  article_ref: string
  revision: string
  status: string
  line_count: number
  description: string
}

export interface ECN {
  id: string
  ref: string
  title: string
  description: string
  affected_bom: string | null
  status: string
  priority: string
  requested_by: string
  requested_by_name: string
  approved_by: string | null
  effective_date: string | null
}

export const plmApi = {
  listBOMs: (params = {}) => apiClient.get('/v1/plm/boms/', { params }).then(r => r.data),
  listECNs: (params = {}) => apiClient.get('/v1/plm/ecns/', { params }).then(r => r.data),
  getBOM: (id: string) => apiClient.get(`/v1/plm/boms/${id}/`).then(r => r.data),
}
