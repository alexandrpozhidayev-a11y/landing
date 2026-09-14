{{-- Язык интерфейса админки (языки контента в формах — отдельно, во вкладках). --}}
<div {{ $attributes->merge(['class' => 'flex items-center gap-1 text-xs font-semibold uppercase']) }} role="group" aria-label="{{ __('Language') }}">
    @foreach (config('content.locales') as $code => $label)
        @php($current = app()->getLocale() === $code)
        <a href="{{ route('locale.switch', $code) }}" hreflang="{{ $code }}" title="{{ $label }}"
           @if ($current) aria-current="true" @endif
           @class([
               'px-2 py-1 rounded-md',
               'bg-gray-800 text-white' => $current,
               'text-gray-500 hover:text-gray-700 hover:bg-gray-100' => ! $current,
           ])>{{ $code }}</a>
    @endforeach
</div>
