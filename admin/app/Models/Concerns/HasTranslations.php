<?php

namespace App\Models\Concerns;

/**
 * Переводимые поля хранятся JSON-объектом {"en": "...", "kk": "...", "ru": "..."}.
 * Модель перечисляет их в $translatable и кастит в 'array'.
 * Языки — config('content.locales'), первый из них основной (запасной).
 */
trait HasTranslations
{
    /** @return list<string> */
    public static function locales(): array
    {
        return array_keys(config('content.locales'));
    }

    public static function defaultLocale(): string
    {
        return static::locales()[0];
    }

    /** Значение на нужном языке, если его нет — на основном. */
    public function translate(string $field, ?string $locale = null): ?string
    {
        $values = $this->getAttribute($field) ?: [];
        $locale ??= static::defaultLocale();

        return $values[$locale] ?? $values[static::defaultLocale()] ?? null;
    }

    /** Все языки сразу; незаполненные — значением основного языка. */
    public function translationsWithFallback(string $field): array
    {
        return collect(static::locales())
            ->mapWithKeys(fn (string $locale) => [$locale => $this->translate($field, $locale)])
            ->all();
    }

    /** Языки, на которых запись заполнена (по первому переводимому полю). */
    public function filledLocales(): array
    {
        $values = $this->getAttribute($this->translatable[0]) ?: [];

        return array_keys(array_filter($values, 'filled'));
    }

    /** Данные формы -> JSON-значение: только известные языки и непустые строки. */
    public static function cleanTranslations(?array $input): array
    {
        return collect($input ?? [])
            ->only(static::locales())
            ->map(fn ($value) => is_string($value) ? trim($value) : $value)
            ->filter(fn ($value) => filled($value))
            ->all();
    }
}
