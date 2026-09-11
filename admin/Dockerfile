# Админка (Laravel 12 + Breeze) для dc-valley.com/admin.
# Apache + mod_php; база SQLite и загруженные файлы — в томе storage.

# ---- PHP-зависимости ----
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --no-scripts \
    --prefer-dist --optimize-autoloader --ignore-platform-reqs

# ---- фронт админки (Vite + Tailwind) ----
FROM node:20-alpine AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js tailwind.config.js postcss.config.js ./
COPY resources ./resources
# Tailwind сканирует шаблоны пагинации Laravel — нужны при сборке CSS
COPY --from=vendor /app/vendor/laravel/framework/src/Illuminate/Pagination/resources/views \
     ./vendor/laravel/framework/src/Illuminate/Pagination/resources/views
RUN npm run build

# ---- рантайм ----
FROM php:8.3-apache
RUN a2enmod rewrite headers \
 && echo "ServerName localhost" > /etc/apache2/conf-available/servername.conf \
 && a2enconf servername \
 && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY docker/php.ini "$PHP_INI_DIR/conf.d/zz-admin.ini"
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/entrypoint.sh /usr/local/bin/admin-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/admin-entrypoint && chmod +x /usr/local/bin/admin-entrypoint

WORKDIR /var/www/html
COPY . .
COPY --from=vendor /app/vendor ./vendor
COPY --from=assets /app/public/build ./public/build

# Без dev-пакетов (Breeze, Pail, Sail) — пересобрать список провайдеров
RUN php artisan package:discover --ansi \
 && chown -R www-data:www-data storage bootstrap/cache

ENTRYPOINT ["admin-entrypoint"]
CMD ["apache2-foreground"]
