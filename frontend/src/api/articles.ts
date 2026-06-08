import apiClient from './client'

export interface Family {
  id: string
  code: string
  name: string
}

export interface Client {
  id: string
  code: string
  name: string
  country: string
  contact_email: string
}

export interface ArticleRevision {
  id: string
  revision_no: string
  effective_date: string
  drawing_pdf: string | null
  cam_archive: string | null
  notes: string
}

export interface Article {
  id: string
  ref_client: string
  description: string
  family: string
  family_code: string
  family_name: string
  notes: string
  revision_count: number
  latest_revision: ArticleRevision | null
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ArticleFilters {
  search?: string
  family?: string
  deleted?: boolean
  page?: number
  page_size?: number
}

export const articlesApi = {
  list(filters: ArticleFilters = {}): Promise<PaginatedResponse<Article>> {
    return apiClient.get('/articles/', { params: filters }).then(r => r.data)
  },

  get(id: string): Promise<Article & { revisions: ArticleRevision[] }> {
    return apiClient.get(`/articles/${id}/`).then(r => r.data)
  },

  listFamilies(): Promise<Family[]> {
    return apiClient.get('/families/').then(r => r.data)
  },

  listClients(): Promise<PaginatedResponse<Client>> {
    return apiClient.get('/clients/').then(r => r.data)
  },

  createRevision(articleId: string, formData: FormData): Promise<ArticleRevision> {
    return apiClient.post(`/articles/${articleId}/revisions/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}
