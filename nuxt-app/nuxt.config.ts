// https://nuxt.com/docs/api/configuration/nuxt-config
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
  // (сейчас это только /v2 — см. nitro.prerender.routes).
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
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'kk', language: 'kk-KZ', name: 'Қазақша', file: 'kk.json' },
      { code: 'ru', language: 'ru-RU', name: 'Русский', file: 'ru.json' }
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

  // Кэш в браузере: картинки из _ipx и /asset — неделя (имена без хеша, поэтому
  // не «навсегда»), шрифты v2 не меняются — год.
  routeRules: {
    '/_ipx/**': { headers: { 'cache-control': 'public, max-age=604800' } },
    '/asset/**': { headers: { 'cache-control': 'public, max-age=604800' } },
    '/asset/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } }
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      // /v2 — черновик новой главной на согласование. На него никто не ссылается,
      // поэтому crawlLinks его не найдёт — перечисляем явно.
      routes: ['/en', '/kk', '/ru', '/en/v2', '/kk/v2', '/ru/v2']
    }
  }
})
