import apiClient from './client'

export interface Notification {
  id: string
  level: 'info' | 'warning' | 'error'
  message: string
  link: string
  read_at: string | null
  created_at: string
}

export const notificationsApi = {
  list(): Promise<Notification[]> {
    return apiClient.get('/notifications/').then(r => r.data)
  },

  markRead(id: string): Promise<Notification> {
    return apiClient.post(`/notifications/${id}/read/`).then(r => r.data)
  },

  markAllRead(): Promise<{ detail: string }> {
    return apiClient.post('/notifications/read-all/').then(r => r.data)
  },
}
