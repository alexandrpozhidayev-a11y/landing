#!/bin/sh
# Старт контейнера админки: база, ключ, миграции, пользователь, кэши.
# Всё идемпотентно — повторный старт ничего не ломает и данные не трогает.
set -e
cd /var/www/html

mkdir -p storage/app/public storage/framework/cache/data storage/framework/sessions \
         storage/framework/views storage/logs

# База SQLite живёт в томе storage (переживает пересборку образа)
DB_FILE="${DB_DATABASE:-/var/www/html/storage/app/database.sqlite}"
[ -f "$DB_FILE" ] || touch "$DB_FILE"

# APP_KEY: если не задан снаружи — генерируется один раз и хранится в томе
if [ -z "$APP_KEY" ]; then
  [ -f storage/app/.app_key ] || php -r 'echo "base64:".base64_encode(random_bytes(32));' > storage/app/.app_key
  APP_KEY="$(cat storage/app/.app_key)"
  export APP_KEY
fi

php artisan migrate --force
php artisan db:seed --class=AdminUserSeeder --force
[ -L public/storage ] || php artisan storage:link

php artisan config:cache
php artisan route:cache
php artisan view:cache

chown -R www-data:www-data storage bootstrap/cache

exec "$@"
