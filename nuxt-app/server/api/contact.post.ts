// POST /api/contact — заявка из модалки «Let’s talk» (страница v2).
// Письмо уходит на runtimeConfig.contact.to (info@dc-valley.com) через Microsoft Graph
// (server/utils/graphMail.ts). Reply-To — адрес посетителя: «Ответить» в Outlook
// сразу пишет ему.
//
// Защита от спама: скрытое поле-ловушка website и не больше 5 заявок
// с одного IP за 10 минут (в памяти процесса — для одного контейнера достаточно).

interface ContactBody {
  name?: unknown
  email?: unknown
  company?: unknown
  project?: unknown
  consent?: unknown
  website?: unknown
  locale?: unknown
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RATE = { max: 5, windowMs: 10 * 60 * 1000 }
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(time => now - time < RATE.windowMs)
  recent.push(now)
  hits.set(ip, recent)

  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every(time => now - time >= RATE.windowMs)) hits.delete(key)
    }
  }

  return recent.length > RATE.max
}

// Строка из формы: обрезанная, ограниченной длины; однострочные поля — без переносов.
function text(value: unknown, max: number, singleLine = true): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim().slice(0, max)
  return singleLine ? trimmed.replace(/[\r\n]+/g, ' ') : trimmed
}

export default defineEventHandler(async (event) => {
  const body = (await readBody<ContactBody>(event).catch(() => null)) ?? {}

  // Ловушка для ботов: поле скрыто от людей. Заполнено — отвечаем «ок» и ничего не шлём.
  if (text(body.website, 200)) return { ok: true }

  const name = text(body.name, 200)
  const email = text(body.email, 254)
  const company = text(body.company, 200)
  const project = text(body.project, 5000, false)
  const locale = text(body.locale, 5) || 'en'

  const errors: Record<string, 'required' | 'email'> = {}
  if (!name) errors.name = 'required'
  if (!email) errors.email = 'required'
  else if (!EMAIL_RE.test(email)) errors.email = 'email'
  if (body.consent !== true) errors.consent = 'required'

  if (Object.keys(errors).length) {
    throw createError({ statusCode: 422, statusMessage: 'Invalid form', data: { errors } })
  }

  if (rateLimited(getRequestIP(event, { xForwardedFor: true }) ?? 'unknown')) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }

  try {
    await sendMail({
      subject: `Website enquiry: ${name}${company ? ` (${company})` : ''}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Company: ${company || '—'}`,
        `Site language: ${locale}`,
        '',
        'Project:',
        project || '—',
        '',
        '—',
        'Sent from the contact form at dc-valley.com. Reply to this email to answer the sender.'
      ].join('\n'),
      replyTo: { address: email, name }
    })
  }
  catch (err) {
    const notConfigured = err instanceof MailNotConfiguredError
    console.error('[contact] mail not sent:', err instanceof Error ? err.message : err)
    throw createError({ statusCode: notConfigured ? 503 : 502, statusMessage: 'Mail not sent' })
  }

  return { ok: true }
})
