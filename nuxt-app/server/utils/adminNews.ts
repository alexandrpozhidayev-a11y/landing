// Новости из админки для сайта. Адрес API — runtimeConfig.adminApi
// (по умолчанию боевая https://dc-valley.com/admin/api, env NUXT_ADMIN_API).
// Картинки админка отдаёт абсолютными ссылками на себя — используем как есть.

export interface NewsItem {
  id: number
  slug: string
  title: string
  excerpt: string | null
  image: string | null
  published_at: string | null
  is_featured: boolean
  body?: string | null
}

const LOCALES = ['en', 'kk', 'ru']

export function newsLocale(value: unknown): string {
  return typeof value === 'string' && LOCALES.includes(value) ? value : 'en'
}

export function adminApi(path: string, locale: string) {
  const base = useRuntimeConfig().adminApi as string
  return $fetch<{ data: unknown }>(`${base}${path}`, { query: { locale }, timeout: 8000 })
}
