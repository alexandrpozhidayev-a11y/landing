<?php

namespace App\Http\Controllers\Concerns;

trait TranslatableFields
{
    /**
     * Человеческие названия полей для ошибок валидации на языке интерфейса:
     * "title.kk" -> "Title (KK)" / "Заголовок (KK)".
     *
     * @param  array<string, string>  $fields  поле => подпись (английский ключ перевода)
     */
    protected function translatableAttributes(array $fields): array
    {
        $names = [];

        foreach ($fields as $field => $label) {
            foreach (array_keys(config('content.locales')) as $locale) {
                $names["{$field}.{$locale}"] = __($label).' ('.strtoupper($locale).')';
            }
        }

        return $names;
    }
}
