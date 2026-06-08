import { ref } from 'vue'
import { defineStore } from 'pinia'
import { articlesApi, type Article, type ArticleFilters, type Family } from '@/api/articles'

export const useArticlesStore = defineStore('articles', () => {
  const articles = ref<Article[]>([])
  const currentArticle = ref<(Article & { revisions: any[] }) | null>(null)
  const families = ref<Family[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchArticles(filters: ArticleFilters = {}) {
    loading.value = true
    error.value = null
    try {
      const res = await articlesApi.list(filters)
      articles.value = res.results
      total.value = res.count
    } catch (e: any) {
      error.value = e?.response?.data?.detail ?? 'Failed to load articles'
    } finally {
      loading.value = false
    }
  }

  async function fetchArticle(id: string) {
    loading.value = true
    error.value = null
    try {
      currentArticle.value = await articlesApi.get(id)
    } catch (e: any) {
      error.value = e?.response?.data?.detail ?? 'Failed to load article'
    } finally {
      loading.value = false
    }
  }

  async function fetchFamilies() {
    try {
      families.value = await articlesApi.listFamilies()
    } catch {
      // silently fail
    }
  }

  function clearCurrent() {
    currentArticle.value = null
  }

  return { articles, currentArticle, families, total, loading, error, fetchArticles, fetchArticle, fetchFamilies, clearCurrent }
})
