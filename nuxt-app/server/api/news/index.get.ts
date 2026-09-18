// GET /api/news?locale=en|kk|ru — опубликованные новости из админки (кэш 5 минут).
// Если админка недоступна — пустой список, а не ошибка: блок новостей просто не покажется.
export default defineCachedEventHandler(async (event) => {
  const locale = newsLocale(getQuery(event).locale)
  try {
    const res = await adminApi('/news', locale)
    return { data: res.data as NewsItem[] }
  }
  catch (err) {
    console.error('[news] admin API unavailable:', err instanceof Error ? err.message : err)
    return { data: [] as NewsItem[] }
  }
}, {
  name: 'news-list',
  maxAge: 60 * 5,
  getKey: event => newsLocale(getQuery(event).locale)
})
