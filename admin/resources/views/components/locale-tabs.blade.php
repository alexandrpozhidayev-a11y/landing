{{--
    Вкладки языков для переводимых полей формы.
    $fields — поля этой формы (чтобы подсветить вкладку с ошибкой и открыть её).
    Внутри слота доступна переменная $locale через <x-slot> нельзя — поэтому
    содержимое вкладки передаётся колбэком $render($code, $isDefault).
--}}
@props(['fields' => [], 'render'])

@php
    $locales = config('content.locales');
    $default = array_key_first($locales);
    $hasErrors = fn (string $code) => collect($fields)->contains(fn ($f) => $errors->has("{$f}.{$code}"));
    $open = collect(array_keys($locales))->first(fn ($code) => $hasErrors($code)) ?? $default;
@endphp

<div x-data="{ tab: '{{ $open }}' }" class="rounded-lg border border-gray-200">
    <div class="flex border-b border-gray-200 bg-gray-50 rounded-t-lg">
        @foreach ($locales as $code => $label)
            <button type="button"
                    x-on:click="tab = '{{ $code }}'"
                    :class="tab === '{{ $code }}' ? 'bg-white text-gray-900 border-indigo-500' : 'text-gray-500 border-transparent hover:text-gray-700'"
                    class="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px">
                {{ strtoupper($code) }}
                <span class="hidden sm:inline text-xs text-gray-400">{{ $label }}</span>
                @if ($code === $default)
                    <span class="text-red-500" title="Required">*</span>
                @endif
                @if ($hasErrors($code))
                    <span class="ms-1 inline-block w-2 h-2 rounded-full bg-red-500" title="Has errors"></span>
                @endif
            </button>
        @endforeach
    </div>

    @foreach ($locales as $code => $label)
        <div x-show="tab === '{{ $code }}'" @if ($code !== $open) x-cloak @endif class="p-4 space-y-6">
            @if ($code !== $default)
                <p class="text-xs text-gray-500">Optional. Empty fields are shown in English on the site.</p>
            @endif
            {!! $render($code, $code === $default) !!}
        </div>
    @endforeach
</div>
