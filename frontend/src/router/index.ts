import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/components/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/views/OrderListView.vue'),
        },
        {
          path: 'orders/new',
          name: 'orders-new',
          component: () => import('@/views/OrderFormView.vue'),
        },
        {
          path: 'orders/:id',
          name: 'orders-detail',
          component: () => import('@/views/OrderDetailView.vue'),
        },
        {
          path: 'queue/:code',
          name: 'queue',
          component: () => import('@/views/QueueView.vue'),
        },
        {
          path: 'articles',
          name: 'articles',
          component: () => import('@/views/ArticleListView.vue'),
        },
        {
          path: 'articles/:id',
          name: 'articles-detail',
          component: () => import('@/views/ArticleDetailView.vue'),
        },
        {
          path: 'planning',
          name: 'planning',
          component: () => import('@/views/PlanningView.vue'),
        },
        {
          path: 'gantt',
          name: 'gantt',
          component: () => import('@/views/GanttView.vue'),
        },
        {
          path: 'notifications',
          name: 'notifications',
          component: () => import('@/views/NotificationsView.vue'),
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/ProfileView.vue'),
        },
        {
          path: 'admin/users',
          name: 'admin-users',
          component: () => import('@/views/UsersView.vue'),
          meta: { role: 'admin' },
        },
        {
          path: 'admin/settings',
          name: 'admin-settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { role: 'admin' },
        },
        // Workflow module
        {
          path: 'workflow',
          name: 'workflow-projects',
          component: () => import('@/views/WorkflowProjectListView.vue'),
        },
        {
          path: 'workflow/:id',
          name: 'workflow-project',
          component: () => import('@/views/WorkflowProjectDetailView.vue'),
        },
        {
          path: 'workflow/orders/:id',
          name: 'workflow-order',
          component: () => import('@/views/WorkflowOrderDetailView.vue'),
        },
        {
          path: 'workflow/apns/:id',
          name: 'workflow-apn',
          component: () => import('@/views/WorkflowApnView.vue'),
        },
          {
          path: 'jimide-4030',
          name: 'jimide-4030',
          component: () => import('@/views/Jimide4030View.vue'),
        },
      // ── ERP Modules ──────────────────────────────────────────────────────
        {
          path: 'sales',
          name: 'sales',
          component: () => import('@/views/SalesView.vue'),
        },
        {
          path: 'purchase',
          name: 'purchase',
          component: () => import('@/views/PurchaseView.vue'),
        },
        {
          path: 'inventory',
          name: 'inventory',
          component: () => import('@/views/InventoryView.vue'),
        },
        {
          path: 'manufacturing',
          name: 'manufacturing',
          component: () => import('@/views/ManufacturingView.vue'),
        },
        {
          path: 'plm',
          name: 'plm',
          component: () => import('@/views/PlmView.vue'),
        },
        {
          path: 'quality',
          name: 'quality',
          component: () => import('@/views/QualityView.vue'),
        },
        {
          path: 'hr',
          name: 'hr',
          component: () => import('@/views/HrView.vue'),
        },
        {
          path: 'finance',
          name: 'finance',
          component: () => import('@/views/FinanceView.vue'),
        },
        {
          path: 'reporting',
          name: 'reporting',
          component: () => import('@/views/ReportingView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router
