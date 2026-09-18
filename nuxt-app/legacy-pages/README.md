# legacy-pages

Страницы прежнего дизайна, снятые с сайта, когда главной стал дизайн v2
(`pages/index.vue`, бывший `pages/v2.vue`):

- `index.vue` — прежняя главная (промо-блок Digital Bridge, Why, Models, CTA);
- `about.vue`, `services.vue`, `ai.vue`, `faq.vue`.

Здесь они не маршрутизируются и в сборку не попадают — лежат, чтобы можно было
вернуть. Старые адреса (`/about`, `/services`, `/ai`, `/faq`, `/v2`) редиректят
на главную — `routeRules` в `nuxt.config.ts`.

Вернуть страницу: перенести файл обратно в `pages/` и убрать её адрес из
`hiddenPages` в `nuxt.config.ts`.

На сайте из старого дизайна остались `pages/team.vue` и `pages/news/*` —
на них ведут ссылки с главной.
