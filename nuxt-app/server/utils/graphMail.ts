// Отправка писем через Microsoft Graph (приложение Entra ID, client credentials).
// Почта dc-valley.com живёт в Microsoft 365, а SPF домена разрешает отправку только
// с серверов Microsoft — поэтому письмо не шлётся SMTP-ом с нашего сервера,
// а отдаётся в Graph от имени ящика-отправителя.
//
// Настройки — runtimeConfig.contact (env NUXT_CONTACT_*, см. docker-compose.yml).
// Приложению нужно разрешение Mail.Send (Application) с admin consent,
// ограниченное одним ящиком-отправителем.

export class MailNotConfiguredError extends Error {}

interface Mail {
  subject: string
  text: string
  replyTo?: { address: string, name?: string }
}

interface ContactConfig {
  tenantId: string
  clientId: string
  clientSecret: string
  sender: string
  to: string
}

let token: { value: string, expires: number } | null = null

async function accessToken(c: ContactConfig): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value

  const res = await $fetch<{ access_token: string, expires_in: number }>(
    `https://login.microsoftonline.com/${encodeURIComponent(c.tenantId)}/oauth2/v2.0/token`,
    {
      method: 'POST',
      body: new URLSearchParams({
        client_id: c.clientId,
        client_secret: c.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })
    }
  )

  token = { value: res.access_token, expires: Date.now() + res.expires_in * 1000 }
  return token.value
}

export async function sendMail({ subject, text, replyTo }: Mail): Promise<void> {
  const c = useRuntimeConfig().contact as ContactConfig
  if (!c.tenantId || !c.clientId || !c.clientSecret || !c.sender || !c.to) {
    throw new MailNotConfiguredError('Microsoft Graph mail is not configured (NUXT_CONTACT_*)')
  }

  await $fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(c.sender)}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken(c)}` },
    body: {
      message: {
        subject,
        body: { contentType: 'Text', content: text },
        toRecipients: c.to.split(',').map(address => ({ emailAddress: { address: address.trim() } })),
        replyTo: replyTo ? [{ emailAddress: replyTo }] : []
      },
      saveToSentItems: false
    }
  })
}
