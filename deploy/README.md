# Deploy: nginx + certbot on hvitl1

Site lives at `/var/www/landing` (already `git clone`d there).

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
still terminates TLS and just reverse-proxies to it — swap the config:

```bash
cp /var/www/landing/deploy/nginx.nuxt.conf /etc/nginx/sites-available/data-center-valley.com
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
