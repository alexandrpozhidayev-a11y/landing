// GET /test — тестовая страница: что удаётся вытащить из LinkedIn без входа.
// Не индексируется, ссылок на неё нет. ?refresh — загрузить заново, мимо кэша.
import type { LinkedInFeed, LinkedInPost } from '../utils/linkedin'

const esc = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const formatDate = (iso: string) => iso
  ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Almaty' }).format(new Date(iso))
  : '—'

function renderPost(post: LinkedInPost, index: number): string {
  const badges = [
    post.reshare && 'Репост',
    post.images.length && `Фото: ${post.images.length}`,
    post.video && 'Видео',
    post.document && `Документ: ${post.document.pages} стр.`
  ].filter(Boolean).map(b => `<span class="badge">${esc(String(b))}</span>`).join('')

  const media = [
    post.images.length
      ? `<div class="images">${post.images.map(src => `<a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer"></a>`).join('')}</div>`
      : '',
    post.video
      ? `<video controls preload="none" src="${esc(post.video.src)}"${post.video.poster ? ` poster="${esc(post.video.poster)}"` : ''}></video>`
      : '',
    post.document
      ? `<div class="doc">${post.document.cover ? `<img src="${esc(post.document.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<div><b>${esc(post.document.title || 'Документ')}</b><br>${post.document.pages} стр. — листается только в LinkedIn</div></div>`
      : ''
  ].join('')

  const reshare = post.reshare
    ? `<blockquote><div class="muted">Репост: ${esc(post.reshare.author || '—')}</div><p class="text">${esc(post.reshare.text)}</p></blockquote>`
    : ''

  return `<article>
  <header>
    <span class="num">#${index + 1}</span>
    <time datetime="${esc(post.publishedAt)}">${esc(formatDate(post.publishedAt))}</time>
    ${badges}
    <span class="stats">♥ ${post.reactions} · 💬 ${post.comments}</span>
  </header>
  <p class="text">${esc(post.text) || '<span class="muted">(без текста)</span>'}</p>
  ${reshare}
  ${media}
  <footer><a href="${esc(post.url)}" target="_blank" rel="noopener">Открыть в LinkedIn ↗</a> <span class="muted">${esc(post.id)}</span></footer>
</article>`
}

function renderPage(feed: LinkedInFeed, fresh: boolean): string {
  const ok = !feed.error
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Тест: посты LinkedIn</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 24px 16px 64px; background: #E8E8E3; color: #111; font: 15px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif; }
  main { max-width: 760px; margin: 0 auto; }
  h1 { margin: 0 0 8px; font-size: 28px; }
  .status { padding: 14px 16px; margin: 16px 0 24px; background: #F0F0EC; border-left: 4px solid ${ok ? '#2E7D32' : '#B3261E'}; }
  .status p { margin: 2px 0; }
  article { background: #fff; padding: 18px 20px; margin-bottom: 16px; border: 1px solid #C9C7C1; }
  article header { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 13px; }
  .num { font-weight: 700; }
  .badge { padding: 1px 8px; background: #111; color: #fff; font-size: 11px; }
  .stats { margin-left: auto; color: #6E6E68; }
  .text { white-space: pre-wrap; overflow-wrap: anywhere; margin: 12px 0; }
  blockquote { margin: 12px 0; padding: 4px 14px; border-left: 3px solid #C9C7C1; background: #F7F7F4; }
  .images { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 6px; margin: 12px 0; }
  .images img, .doc img { display: block; width: 100%; height: 160px; object-fit: cover; background: #ddd; }
  video { display: block; width: 100%; margin: 12px 0; background: #000; }
  .doc { display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: center; margin: 12px 0; font-size: 14px; }
  .doc img { height: 150px; }
  footer { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 13px; }
  .muted { color: #6E6E68; font-size: 12px; }
  a { color: #C9481F; }
</style>
</head>
<body>
<main>
  <h1>LinkedIn → сайт: тест парсинга</h1>
  <p class="muted">Гостевая страница компании, без входа в аккаунт и без API. Эксперимент — разметка LinkedIn может поменяться.</p>
  <div class="status">
    <p><b>${ok ? `Найдено постов: ${feed.posts.length}` : `Ошибка: ${esc(feed.error!)}`}</b></p>
    <p>Источник: <a href="${esc(feed.source)}" target="_blank" rel="noopener">${esc(feed.source)}</a> · HTTP ${feed.status}</p>
    <p>Загружено: ${esc(formatDate(feed.fetchedAt))} ${fresh ? '(заново, мимо кэша)' : '(из кэша, обновляется раз в час)'}</p>
    <p><a href="/test?refresh">Загрузить заново</a> · <a href="/api/linkedin-posts">JSON</a></p>
  </div>
  ${feed.posts.map(renderPost).join('\n')}
</main>
</body>
</html>`
}

export default defineEventHandler(async (event) => {
  const fresh = getQuery(event).refresh !== undefined
  const feed = fresh ? await fetchLinkedInFeed() : await getLinkedInFeed()

  setResponseHeaders(event, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow'
  })
  return renderPage(feed, fresh)
})
