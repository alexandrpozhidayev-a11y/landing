{{-- Какие языки у записи заполнены: EN KK RU (незаполненные — серые, на сайте будет английский). --}}
@props(['filled' => []])

<div class="flex gap-1">
    @foreach (array_keys(config('content.locales')) as $code)
        @php($ok = in_array($code, $filled, true))
        <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase {{ $ok ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400' }}"
              title="{{ $ok ? 'Translated' : 'Not translated — English is shown' }}">{{ $code }}</span>
    @endforeach
</div>
