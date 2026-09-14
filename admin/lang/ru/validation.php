<?php

// Правила, которые встречаются в админке. Остальные берутся из lang/en.
return [
    'accepted' => 'Необходимо принять :attribute.',
    'array' => 'Поле :attribute должно быть массивом.',
    'boolean' => 'Поле :attribute должно быть «да» или «нет».',
    'confirmed' => 'Поле :attribute не совпадает с подтверждением.',
    'current_password' => 'Неверный пароль.',
    'date' => 'Поле :attribute должно быть корректной датой.',
    'email' => 'Поле :attribute должно быть корректным email.',
    'exists' => 'Выбранное значение поля :attribute не найдено.',
    'file' => 'Поле :attribute должно быть файлом.',
    'image' => 'Поле :attribute должно быть изображением.',
    'in' => 'Выбрано недопустимое значение поля :attribute.',
    'integer' => 'Поле :attribute должно быть целым числом.',
    'lowercase' => 'Поле :attribute должно быть в нижнем регистре.',
    'max' => [
        'array' => 'В поле :attribute должно быть не больше :max элементов.',
        'file' => 'Файл :attribute должен быть не больше :max КБ.',
        'numeric' => 'Поле :attribute должно быть не больше :max.',
        'string' => 'Поле :attribute должно быть не длиннее :max символов.',
    ],
    'mimes' => 'Файл :attribute должен быть одного из типов: :values.',
    'mimetypes' => 'Файл :attribute должен быть одного из типов: :values.',
    'min' => [
        'array' => 'В поле :attribute должно быть не меньше :min элементов.',
        'file' => 'Файл :attribute должен быть не меньше :min КБ.',
        'numeric' => 'Поле :attribute должно быть не меньше :min.',
        'string' => 'Поле :attribute должно быть не короче :min символов.',
    ],
    'numeric' => 'Поле :attribute должно быть числом.',
    'password' => [
        'letters' => 'Поле :attribute должно содержать хотя бы одну букву.',
        'mixed' => 'Поле :attribute должно содержать заглавные и строчные буквы.',
        'numbers' => 'Поле :attribute должно содержать хотя бы одну цифру.',
        'symbols' => 'Поле :attribute должно содержать хотя бы один символ.',
        'uncompromised' => 'Такой :attribute встречался в утечках данных. Выберите другой.',
    ],
    'required' => 'Поле :attribute обязательно для заполнения.',
    'string' => 'Поле :attribute должно быть строкой.',
    'unique' => 'Такое значение поля :attribute уже занято.',
    'uploaded' => 'Не удалось загрузить :attribute.',
    'url' => 'Поле :attribute должно быть корректным URL.',

    'custom' => [],

    'attributes' => [
        'current_password' => 'текущий пароль',
        'email' => 'email',
        'image' => 'обложка',
        'name' => 'имя',
        'password' => 'пароль',
        'photo' => 'портрет',
        'published_at' => 'дата',
        'sort_order' => 'порядок',
    ],
];
