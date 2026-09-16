// Посты страницы компании в LinkedIn — из гостевой (без входа) версии страницы.
//
// ЭКСПЕРИМЕНТ (страница /test): официального API здесь нет. Разметка LinkedIn
// может поменяться в любой момент, а запросы с IP хостинга LinkedIn может
// отсекать (ответ 999). Видны только последние ~10 постов.
// Результат кэшируется на час; неудачная загрузка в кэш не попадает.

export const LINKEDIN_COMPANY_URL = 'https://www.linkedin.com/company/data-center-valley-kazakhstan/'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'

export interface LinkedInPost {
  id: string // urn:li:activity:…
  url: string
  publishedAt: string // ISO, вычисляется из ID поста
  text: string
  images: string[]
  video: { src: string, poster?: string } | null
  document: { title: string, pages: number, cover?: string } | null
  reshare: { author: string, text: string } | null
  reactions: number
  comments: number
}

export interface LinkedInFeed {
  source: string
  fetchedAt: string
  status: number
  posts: LinkedInPost[]
  error?: string
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ' }

function decode(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1]!.toLowerCase() === 'x' ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return ENTITIES[entity.toLowerCase()] ?? match
  })
}

// HTML фрагмента -> текст: ссылки и упоминания остаются своим текстом, переносы — \n.
function toText(html: string): string {
  return decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).trim()
}

function innerOf(html: string, testId: string): string | null {
  const match = html.match(new RegExp(`<(\\w+)\\b[^>]*data-test-id="${testId}"[^>]*>([\\s\\S]*?)</\\1>`))
  return match ? match[2]! : null
}

function count(html: string, testId: string): number {
  const match = html.match(new RegExp(`data-test-id="${testId}"[^>]*>\\s*([\\d.,]+)`))
  return match ? Number.parseInt(match[1]!.replace(/[.,]/g, ''), 10) : 0
}

// В ID поста (Snowflake-подобный) старшие 41 бит — время публикации в мс.
function dateFromId(id: string): string {
  try {
    return new Date(Number(BigInt(id.split(':').pop()!) >> 22n)).toISOString()
  }
  catch {
    return ''
  }
}

function images(card: string): string[] {
  const start = card.indexOf('data-test-id="feed-images-content"')
  if (start < 0) return []
  const block = card.slice(start, card.indexOf('</ul>', start))
  const byMedia = new Map<string, string>()
  for (const [, raw] of block.matchAll(/(?:data-delayed-url|src)="(https:\/\/media\.licdn\.com\/dms\/image\/[^"]+)"/g)) {
    const url = decode(raw!)
    const media = url.match(/\/image\/v2\/([^/]+)\//)?.[1] ?? url
    if (!byMedia.has(media)) byMedia.set(media, url)
  }
  return [...byMedia.values()]
}

function video(card: string): LinkedInPost['video'] {
  const tag = card.match(/<video\b[^>]*>/)?.[0]
  if (!tag) return null
  try {
    const sources = JSON.parse(decode(tag.match(/data-sources="([^"]+)"/)?.[1] ?? '[]')) as { src: string }[]
    if (!sources[0]?.src) return null
    const poster = tag.match(/data-poster-url="([^"]+)"/)?.[1]
    return { src: sources[0].src, poster: poster ? decode(poster) : undefined }
  }
  catch {
    return null
  }
}

function documentOf(card: string): LinkedInPost['document'] {
  const raw = card.match(/data-native-document-config="([^"]+)"/)?.[1]
  if (!raw) return null
  try {
    const doc = JSON.parse(decode(raw)).doc ?? {}
    const cover = JSON.stringify(doc.coverPages ?? '').match(/https:\/\/[^"\\]+/)?.[0]
    return { title: doc.title ?? '', pages: Number(doc.totalPageCount) || 0, cover }
  }
  catch {
    return null
  }
}

function reshare(card: string): LinkedInPost['reshare'] {
  const start = card.indexOf('data-test-id="feed-reshare-content"')
  if (start < 0) return null
  const part = card.slice(start)
  const lockup = part.slice(part.indexOf('feed-reshare-content__entity-lockup'))
  const author = lockup.match(/<a\b[^>]*>\s*([^<]+?)\s*<\/a>/)?.[1] ?? ''
  const text = innerOf(part, 'feed-reshare-content__commentary')
  return { author: decode(author), text: text ? toText(text) : '' }
}

export function parseLinkedInPosts(html: string): LinkedInPost[] {
  const marker = '<a class="main-feed-card__overlay-link'
  const starts: number[] = []
  for (let i = html.indexOf(marker); i >= 0; i = html.indexOf(marker, i + 1)) starts.push(i)

  return starts.flatMap((start, i) => {
    const card = html.slice(start, starts[i + 1] ?? start + 60_000)
    const id = card.match(/data-activity-urn="([^"]+)"/)?.[1]
    if (!id) return []
    const commentary = innerOf(card, 'main-feed-activity-card__commentary')
    return [{
      id,
      url: decode(card.match(/href="([^"]+)"/)?.[1] ?? `https://www.linkedin.com/feed/update/${id}/`),
      publishedAt: dateFromId(id),
      text: commentary ? toText(commentary) : '',
      images: images(card),
      video: video(card),
      document: documentOf(card),
      reshare: reshare(card),
      reactions: count(card, 'social-actions__reaction-count'),
      comments: count(card, 'social-actions__comments')
    }]
  })
}

export async function fetchLinkedInFeed(): Promise<LinkedInFeed> {
  const fetchedAt = new Date().toISOString()
  try {
    const res = await fetch(LINKEDIN_COMPANY_URL, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000)
    })
    if (res.status !== 200) {
      return { source: LINKEDIN_COMPANY_URL, fetchedAt, status: res.status, posts: [], error: `LinkedIn responded with HTTP ${res.status}` }
    }
    const posts = parseLinkedInPosts(await res.text())
    return {
      source: LINKEDIN_COMPANY_URL,
      fetchedAt,
      status: res.status,
      posts,
      error: posts.length ? undefined : 'No posts found on the page (LinkedIn markup may have changed)'
    }
  }
  catch (err) {
    return { source: LINKEDIN_COMPANY_URL, fetchedAt, status: 0, posts: [], error: err instanceof Error ? err.message : String(err) }
  }
}

export const getLinkedInFeed = defineCachedFunction(fetchLinkedInFeed, {
  name: 'linkedin-feed',
  getKey: () => 'company',
  maxAge: 60 * 60,
  // Ошибку (999, таймаут, пустой разбор) не кэшируем — следующий заход попробует снова.
  validate: entry => (entry.value?.posts.length ?? 0) > 0
})
