// GET /api/news/:slug?locale=en|kk|ru — одна новость с полным текстом (кэш 5 минут).
// Нет такой (или не опубликована) — 404.
export default defineCachedEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const locale = newsLocale(getQuery(event).locale)
  try {
    const res = await adminApi(`/news/${encodeURIComponent(slug)}`, locale)
    return { data: res.data as NewsItem }
  }
  catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 404) throw createError({ statusCode: 404, statusMessage: 'News not found' })
    console.error('[news] admin API unavailable:', err instanceof Error ? err.message : err)
    throw createError({ statusCode: 502, statusMessage: 'News unavailable' })
  }
}, {
  name: 'news-item',
  maxAge: 60 * 5,
  getKey: event => `${getRouterParam(event, 'slug')}:${newsLocale(getQuery(event).locale)}`
})
