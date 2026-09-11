# Deploy

## Новый сервер: 94.247.128.150 (dc-valley.com), Docker

Основной репозиторий — https://github.com/sasha26548996565/DCV (remote `origin`).
Сайт — Nuxt в контейнере на `127.0.0.1:3004`, nginx на хосте терминирует HTTPS
и проксирует на него (`nginx.prod.conf`).

Первичная настройка и любой следующий передеплой — один скрипт, под root.
Репозиторий приватный, поэтому в первый раз скрипт кладём на сервер сами:

```bash
scp deploy/setup-server.sh root@94.247.128.150:/root/
ssh root@94.247.128.150 bash /root/setup-server.sh
# дальше, когда репозиторий уже на месте:
ssh root@94.247.128.150 bash /var/www/landing/deploy/setup-server.sh
```

Код сервер забирает по **deploy key** (только чтение). При первом запуске
скрипт создаст ключ `/root/.ssh/dcv_deploy`, напечатает его и остановится —
добавить его в GitHub: DCV → Settings → Deploy keys → Add deploy key
(галочку *Allow write access* не ставить), и запустить скрипт ещё раз.

Что он делает: ставит git/nginx/certbot и Docker, клонирует (или `git pull`)
репозиторий в `/var/www/landing`, `docker compose up -d --build`, при первом
запуске — временный HTTP-конфиг и выпуск сертификата Let's Encrypt, затем
кладёт `nginx.prod.conf` и перечитывает nginx. Повторный запуск безопасен.

## Админка: https://dc-valley.com/admin

Laravel-приложение из папки `admin/`, сервис `admin` в `docker-compose.yml`
(контейнер на `127.0.0.1:3005`). Разделы: **News** и **Team**, тексты на
EN (обязательно) / KK / RU. Публичное API для сайта (только опубликованное):
`/admin/api/news`, `/admin/api/news/{slug}`, `/admin/api/team`, параметр
`?locale=en|kk|ru`.

Первый запуск на сервере (после `git pull`):

```bash
cd /var/www/DCV
docker compose up -d --build
# nginx: добавился location /admin/ — обновить конфиг и перечитать
cp deploy/nginx.prod.conf /etc/nginx/sites-available/dc-valley.com
nginx -t && systemctl reload nginx
curl -I https://dc-valley.com/admin/login   # ждём 200
```

При каждом старте контейнер сам применяет миграции и создаёт тестового
пользователя `admin@dc-valley.com`, если его ещё нет (`AdminUserSeeder`,
в репозитории только хеш пароля). Регистрации нет. База SQLite, загруженные
фото и APP_KEY лежат в томе `admin-storage` и переживают пересборку.
Бэкап данных админки:

```bash
docker run --rm -v dcv_admin-storage:/data -v /root:/backup alpine   tar czf /backup/admin-storage-$(date +%F).tgz -C /data .
```

`/v2` (черновик новой главной) открывается только по прямой ссылке:
ссылок на неё с сайта нет, в `<head>` стоит `noindex, nofollow`.

---

Ниже — история: деплой на старом сервере hvitl1 (статика, затем переход на Docker).

## Старый сервер: nginx + certbot on hvitl1

Site lives at `/var/www/landing` (already `git clone`d there).

> **Живой домен — `dc-valley.com`**, конфиг на сервере называется
> `/etc/nginx/sites-available/dc-valley.com` (симлинк на него в
> `sites-enabled/`). Файлы `nginx.bootstrap.conf` / `nginx.conf` /
> `nginx.nuxt.conf` ниже написаны под другой домен —
> `data-center-valley.com` — и на этом сервере ничего не делают: если
> скопировать их под именем `data-center-valley.com`, симлинка не будет,
> nginx их не подхватит, и сайт продолжит работать по-старому.
> Актуальный продакшен-конфиг — **`nginx.prod.conf`**, см. раздел
> «Cutting over to the Nuxt app» в конце.

## 1. Bootstrap over HTTP (no cert yet)

```bash
mkdir -p /var/www/certbot

cp /var/www/landing/deploy/nginx.bootstrap.conf /etc/nginx/sites-available/data-center-valley.com
ln -sf /etc/nginx/sites-available/data-center-valley.com /etc/nginx/sites-enabled/

nginx -t && systemctl reload nginx
```

Check `http://data-center-valley.com` loads before continuing.

## 2. Get the certificate

```bash
apt install -y certbot   # if not already installed

certbot certonly --webroot -w /var/www/certbot \
  -d data-center-valley.com -d www.data-center-valley.com
```

## 3. Switch to the HTTPS config

```bash
cp /var/www/landing/deploy/nginx.conf /etc/nginx/sites-available/data-center-valley.com
nginx -t && systemctl reload nginx
```

`nginx.conf` now finds real cert files under `/etc/letsencrypt/live/...`, so
`nginx -t` should pass. Site is now served over HTTPS with HTTP→HTTPS
redirect.

## Renewal

Certbot installs a systemd timer / cron job automatically
(`certbot renew` dry-run: `certbot renew --dry-run`). Nothing else to do.

## Redeploying after code changes

```bash
cd /var/www/landing && git pull
```

No nginx reload needed — it just serves whatever files are on disk.

## Cutting over to the Nuxt app (Docker)

The static HTML above is still what's live. `nuxt-app/` is the rebuild in
progress; once it's ready to go live, this is the switch:

```bash
cd /var/www/landing
apt install -y docker.io docker-compose-plugin   # if not already installed

docker compose up -d --build
```

This runs the Nuxt/Nitro server as a container on `127.0.0.1:3004` (see
`docker-compose.yml` at the repo root and `nuxt-app/Dockerfile`). Host nginx
still terminates TLS and just reverse-proxies to it.

Check the container answers before touching nginx — until you do, the old
static site keeps serving and nothing is at risk:

```bash
docker compose ps
curl -I http://127.0.0.1:3004/en   # expect 200
```

Then swap the config (back it up first — this is the live site):

```bash
cp /etc/nginx/sites-available/dc-valley.com /root/dc-valley.com.static.bak
cp /var/www/landing/deploy/nginx.prod.conf /etc/nginx/sites-available/dc-valley.com
nginx -t && systemctl reload nginx
```

`nginx.prod.conf` is the file that was already on the server, with the
static-serving `location /` replaced by a proxy to the container —
`server_name`, certificates and redirects are untouched.

Rollback to static:

```bash
cp /root/dc-valley.com.static.bak /etc/nginx/sites-available/dc-valley.com
nginx -t && systemctl reload nginx
```

Redeploying after that point:

```bash
cd /var/www/landing && git pull && docker compose up -d --build
```

When the Laravel admin panel is built, it slots in as another service in
`docker-compose.yml` (placeholder already there) with its own nginx
`location /api/` proxy rule (placeholder in `nginx.nuxt.conf`) — no need to
restructure any of this to add it.
