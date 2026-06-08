import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { financeApi, type Invoice, type Payment, type Account } from '@/api/finance'

export const useFinanceStore = defineStore('finance', () => {
  const invoices = ref<Invoice[]>([])
  const payments = ref<Payment[]>([])
  const accounts = ref<Account[]>([])

  const kpi = computed(() => {
    const customerInvoices = invoices.value.filter(i => i.invoice_type === 'customer')
    const totalInvoiced = customerInvoices.reduce((s, i) => s + Number(i.total_amount), 0)
    const totalPaid = customerInvoices.reduce((s, i) => s + Number(i.paid_amount), 0)
    return {
      unpaidInvoices: invoices.value.filter(i => ['sent', 'overdue', 'partial'].includes(i.status)).length,
      totalInvoiced,
      totalPaid,
      outstanding: totalInvoiced - totalPaid,
    }
  })

  async function fetchAll(params: Record<string, string> = {}) {
    const [invRes, payRes, accRes] = await Promise.all([
      financeApi.listInvoices(params),
      financeApi.listPayments({}),
      financeApi.listAccounts({}),
    ])
    invoices.value = invRes.results ?? invRes
    payments.value = payRes.results ?? payRes
    accounts.value = accRes.results ?? accRes
  }

  return { invoices, payments, accounts, kpi, fetchAll }
})
