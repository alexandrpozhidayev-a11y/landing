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
