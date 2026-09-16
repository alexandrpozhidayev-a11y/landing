// GET /api/linkedin-posts — посты страницы компании в LinkedIn (кэш 1 час).
// Эксперимент, см. server/utils/linkedin.ts.
export default defineEventHandler(() => getLinkedInFeed())
