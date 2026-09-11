<?php

namespace App\Http\Controllers\Concerns;

trait TranslatableFields
{
    /**
     * Человеческие названия полей для ошибок валидации:
     * "title.kk" -> "Title (KK)".
     *
     * @param  array<string, string>  $fields  поле => подпись
     */
    protected function translatableAttributes(array $fields): array
    {
        $names = [];

        foreach ($fields as $field => $label) {
            foreach (array_keys(config('content.locales')) as $locale) {
                $names["{$field}.{$locale}"] = "{$label} (".strtoupper($locale).')';
            }
        }

        return $names;
    }
}
