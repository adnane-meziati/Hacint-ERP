import apiClient from './client'

export interface Invoice {
  id: string
  ref: string
  invoice_type: string
  customer: string | null
  customer_name: string | null
  vendor: string | null
  vendor_name: string | null
  issue_date: string
  due_date: string
  status: string
  currency: string
  total_amount: string
  paid_amount: string
  outstanding_amount: string
  is_overdue: boolean
}

export interface Payment {
  id: string
  invoice: string
  invoice_ref: string
  amount: string
  payment_date: string
  payment_method: string
  reference: string
}

export interface Account {
  id: string
  code: string
  name: string
  account_type: string
  currency: string
  balance: string
  is_active: boolean
}

export const financeApi = {
  listInvoices: (params = {}) => apiClient.get('/v1/finance/invoices/', { params }).then(r => r.data),
  listPayments: (params = {}) => apiClient.get('/v1/finance/payments/', { params }).then(r => r.data),
  listAccounts: (params = {}) => apiClient.get('/v1/finance/accounts/', { params }).then(r => r.data),
}
