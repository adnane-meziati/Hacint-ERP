import apiClient from './client'

export interface Customer {
  id: string
  code: string
  name: string
  country: string
  contact_email: string
  credit_limit: string
  currency: string
  status: string
}

export interface SalesOrder {
  id: string
  ref: string
  customer: string
  customer_name: string
  delivery_date: string
  status: string
  currency: string
  total_amount: string
}

export interface Quote {
  id: string
  ref: string
  customer: string
  customer_name: string
  validity_date: string
  status: string
  total_amount: string
}

export interface SalesOrderLine {
  id: string
  order: string
  item_sku: string
  description: string
  qty: string
  unit_price: string
  delivered_qty: string
  line_total: string
}

export const salesApi = {
  listOrders: (params = {}) => apiClient.get('/v1/sales/orders/', { params }).then(r => r.data),
  listCustomers: (params = {}) => apiClient.get('/v1/sales/customers/', { params }).then(r => r.data),
  listQuotes: (params = {}) => apiClient.get('/v1/sales/quotes/', { params }).then(r => r.data),
  getOrder: (id: string) => apiClient.get(`/v1/sales/orders/${id}/`).then(r => r.data),
  createOrder: (data: Partial<SalesOrder>) => apiClient.post('/v1/sales/orders/', data).then(r => r.data),
  updateOrder: (id: string, data: Partial<SalesOrder>) => apiClient.patch(`/v1/sales/orders/${id}/`, data).then(r => r.data),
}
