// https://nuxt.com/docs/api/configuration/nuxt-config

// Страницы прежнего дизайна, снятые с сайта (файлы — в legacy-pages/). Их адреса
// и черновой /v2 постоянным редиректом ведут на главную, чтобы старые ссылки
// и закладки не упирались в 404.
const hiddenPages = ['about', 'services', 'ai', 'faq', 'v2']
const hiddenRedirects = Object.fromEntries(['', '/en', '/kk', '/ru'].flatMap(prefix =>
  hiddenPages.map(page => [`${prefix}/${page}`, { redirect: { to: prefix || '/', statusCode: 301 } }])))

export default defineNuxtConfig({
  compatibilityDate: '2024-08-01',
  ssr: true,
  devtools: { enabled: true },

  css: ['~/assets/css/style.css'],

  modules: ['@nuxtjs/i18n', '@nuxt/image'],

  // Картинки v2 через <NuxtPicture>: WebP + запасной JPEG, размеры под экран (srcset).
  // AVIF не используем: на этих фото при том же качестве он выходил тяжелее WebP.
  // ipxStatic — варианты генерируются ОДИН раз при сборке (пререндер страниц),
  // рабочий сервер отдаёт готовые файлы из .output/public/_ipx и ничего не
  // пережимает на лету. Годится, пока все страницы с NuxtPicture пререндерятся
  // (сейчас это главная — см. nitro.prerender.routes).
  // sizes у картинок — только в виде "экран:размер" (ключ = нижняя граница, как в
  // Tailwind); запись без ключа (просто "100vw") модуль разбирает неверно.
  image: {
    provider: 'ipxStatic',
    quality: 70,
    format: ['webp'],
    densities: [1, 2],
    screens: { xs: 390, sm: 640, md: 900, lg: 1440, xl: 1920 }
  },

  i18n: {
    baseUrl: 'https://dc-valley.com',
    // Порядок этого массива = порядок переключателя языков в шапке.
    // v2/*.json — тексты главной (дизайн v2, ключи v2.*), отдельно от старых страниц;
    // сливаются с основным файлом локали.
    locales: [
      { code: 'en', language: 'en-US', name: 'English', files: ['en.json', 'v2/en.json'] },
      { code: 'kk', language: 'kk-KZ', name: 'Қазақша', files: ['kk.json', 'v2/kk.json'] },
      { code: 'ru', language: 'ru-RU', name: 'Русский', files: ['ru.json', 'v2/ru.json'] }
    ],
    defaultLocale: 'en',
    strategy: 'prefix',
    langDir: 'locales/',
    lazy: false,
    bundle: {
      optimizeTranslationDirective: false
    },
    compilation: {
      strictMessage: false,
      escapeHtml: false
    }
  },

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/jpeg', href: '/asset/favicon.jpg' }
      ]
    }
  },

  // Модалка «Let’s talk» (v2) -> POST /api/contact -> письмо через Microsoft Graph.
  // Значения задаются только на сервере через env (NUXT_CONTACT_TENANT_ID и т.д.,
  // см. docker-compose.yml и .env.example), в репозитории пусто.
  runtimeConfig: {
    // API админки (новости). Всегда боевая админка — и на сервере, и локально,
    // чтобы на сайте были настоящие новости. Переопределить: env NUXT_ADMIN_API.
    adminApi: 'https://dc-valley.com/admin/api',
    contact: {
      tenantId: '',
      clientId: '',
      clientSecret: '',
      sender: '',
      to: 'info@dc-valley.com'
    }
  },

  // Кэш в браузере: картинки из _ipx и /asset — неделя (имена без хеша, поэтому
  // не «навсегда»), шрифты v2 не меняются — год.
  routeRules: {
    ...hiddenRedirects,
    '/_ipx/**': { headers: { 'cache-control': 'public, max-age=604800' } },
    '/asset/**': { headers: { 'cache-control': 'public, max-age=604800' } },
    '/asset/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } }
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      // Главная (дизайн v2) на трёх языках; остальное crawlLinks находит по ссылкам.
      routes: ['/en', '/kk', '/ru']
    }
  }
})
