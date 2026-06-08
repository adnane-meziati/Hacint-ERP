import apiClient from './client'

export interface Vendor {
  id: string
  code: string
  name: string
  country: string
  contact_email: string
  payment_terms: string
  currency: string
  status: string
}

export interface PurchaseOrder {
  id: string
  ref: string
  vendor: string
  vendor_name: string
  expected_date: string
  status: string
  currency: string
  total_amount: string
}

export const purchaseApi = {
  listOrders: (params = {}) => apiClient.get('/v1/purchase/orders/', { params }).then(r => r.data),
  listVendors: (params = {}) => apiClient.get('/v1/purchase/vendors/', { params }).then(r => r.data),
  listRFQs: (params = {}) => apiClient.get('/v1/purchase/rfqs/', { params }).then(r => r.data),
  listReceipts: (params = {}) => apiClient.get('/v1/purchase/receipts/', { params }).then(r => r.data),
}
