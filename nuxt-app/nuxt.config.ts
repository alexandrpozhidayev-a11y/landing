// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-08-01',
  ssr: true,
  devtools: { enabled: true },

  css: ['~/assets/css/style.css'],

  modules: ['@nuxtjs/i18n'],

  i18n: {
    baseUrl: 'https://dc-valley.com',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'ru', language: 'ru-RU', name: 'Русский', file: 'ru.json' },
      { code: 'kk', language: 'kk-KZ', name: 'Қазақша', file: 'kk.json' }
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

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/en', '/ru', '/kk']
    }
  }
})
