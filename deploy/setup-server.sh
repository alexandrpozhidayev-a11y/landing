#!/usr/bin/env bash
# Первичная настройка нового сервера под dc-valley.com:
# Docker + контейнер Nuxt + nginx + HTTPS (Let's Encrypt).
#
# Запуск на сервере под root (репозиторий приватный — скрипт кладём на сервер сами):
#   scp deploy/setup-server.sh root@94.247.128.150:/root/ && ssh root@94.247.128.150 bash /root/setup-server.sh
# когда репозиторий уже склонирован:
#   bash /var/www/landing/deploy/setup-server.sh
#
# Доступ к приватному репозиторию — deploy key (только чтение). При первом запуске
# скрипт создаст ключ, напечатает его и остановится: добавить его в GitHub ->
# DCV -> Settings -> Deploy keys -> Add deploy key (без "Allow write access"),
# затем запустить скрипт ещё раз.
#
# Скрипт можно запускать повторно: код обновится (git pull), контейнер
# пересоберётся, сертификат повторно не выпускается, конфиг nginx перезапишется
# боевым. То есть он же — команда передеплоя.
set -euo pipefail

DOMAIN=dc-valley.com
REPO=git@github.com:sasha26548996565/DCV.git
DEPLOY_KEY=/root/.ssh/dcv_deploy
# Официальный ключ хоста GitHub (docs.github.com -> SSH key fingerprints) —
# фиксируем, а не доверяем ssh-keyscan вслепую.
GITHUB_HOSTKEY='github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl'
APP_DIR=/var/www/landing
NGINX_SITE=/etc/nginx/sites-available/$DOMAIN

[ "$(id -u)" -eq 0 ] || { echo "Запускать под root"; exit 1; }
export DEBIAN_FRONTEND=noninteractive

echo "==> Пакеты: git, nginx, certbot"
apt-get update -y
apt-get install -y ca-certificates curl git openssl nginx certbot python3-certbot-nginx

echo "==> Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker
docker compose version

echo "==> Доступ к приватному репозиторию (deploy key)"
mkdir -p /root/.ssh
chmod 700 /root/.ssh
[ -f "$DEPLOY_KEY" ] || ssh-keygen -t ed25519 -N '' -C "dcv-deploy@$(hostname)" -f "$DEPLOY_KEY"
if ! grep -q "$DEPLOY_KEY" /root/.ssh/config 2>/dev/null; then
  cat >> /root/.ssh/config <<CFG
Host github.com
  HostName github.com
  User git
  IdentityFile $DEPLOY_KEY
  IdentitiesOnly yes
CFG
  chmod 600 /root/.ssh/config
fi
grep -qF "$GITHUB_HOSTKEY" /root/.ssh/known_hosts 2>/dev/null || echo "$GITHUB_HOSTKEY" >> /root/.ssh/known_hosts
if ! git ls-remote "$REPO" HEAD >/dev/null 2>&1; then
  echo
  echo "Нет доступа к $REPO."
  echo "Добавьте ключ ниже в GitHub: DCV -> Settings -> Deploy keys -> Add deploy key"
  echo "(галочку Allow write access НЕ ставить), затем запустите скрипт ещё раз:"
  echo
  cat "$DEPLOY_KEY.pub"
  exit 1
fi

echo "==> Код -> $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO" "$APP_DIR"
fi

echo "==> Контейнер (Nuxt на 127.0.0.1:3004)"
cd "$APP_DIR"
docker compose up -d --build
for _ in $(seq 1 30); do
  curl -fsS -o /dev/null http://127.0.0.1:3004/en && break
  sleep 2
done
curl -fsS -o /dev/null -w "контейнер: /en -> %{http_code}\n" http://127.0.0.1:3004/en

echo "==> Firewall: открыть 80/443, если ufw включён"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 'Nginx Full'
fi

if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "==> Временный HTTP-конфиг (сертификата ещё нет, боевой конфиг nginx без него не стартует)"
  mkdir -p /var/www/certbot
  cat > "$NGINX_SITE" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:3004;
        proxy_set_header Host \$host;
    }
}
NGINX
  ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/$DOMAIN"
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx

  echo "==> Сертификат Let's Encrypt для $DOMAIN и www.$DOMAIN"
  # Без email: адрес не передаём третьей стороне. Продление автоматическое (systemd-таймер certbot).
  certbot certonly --nginx --non-interactive --agree-tos --register-unsafely-without-email \
    -d "$DOMAIN" -d "www.$DOMAIN"
fi

# nginx.prod.conf подключает эти два файла. Их обычно кладёт плагин certbot-nginx,
# но на всякий случай — создать, если их нет.
if [ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
  SRC=$(find / -name options-ssl-nginx.conf -path '*certbot_nginx*' 2>/dev/null | head -1)
  cp "$SRC" /etc/letsencrypt/options-ssl-nginx.conf
fi
[ -f /etc/letsencrypt/ssl-dhparams.pem ] || openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048

echo "==> Боевой конфиг nginx: HTTPS + редиректы -> контейнер"
cp "$APP_DIR/deploy/nginx.prod.conf" "$NGINX_SITE"
ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/$DOMAIN"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Проверка"
curl -fsS -o /dev/null -w "https://$DOMAIN/en -> %{http_code}\n" "https://$DOMAIN/en"
curl -fsS -o /dev/null -w "https://$DOMAIN/en/v2 -> %{http_code}\n" "https://$DOMAIN/en/v2"
echo "Готово."
