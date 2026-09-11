{{-- Переводимые поля новости для одного языка ($code). Вызывается из news/_form. --}}
<div>
    <x-input-label for="title_{{ $code }}" value="Title" />
    <x-text-input id="title_{{ $code }}" name="title[{{ $code }}]" type="text" class="mt-1 block w-full" :value="$tr('title', $code)" />
    <x-input-error :messages="$errors->get('title.'.$code)" class="mt-2" />
</div>

<div>
    <x-input-label for="excerpt_{{ $code }}" value="Short text (shown in news lists)" />
    <textarea id="excerpt_{{ $code }}" name="excerpt[{{ $code }}]" rows="3" class="{{ $textarea }}">{{ $tr('excerpt', $code) }}</textarea>
    <x-input-error :messages="$errors->get('excerpt.'.$code)" class="mt-2" />
</div>

<div>
    <x-input-label for="body_{{ $code }}" value="Full text" />
    <textarea id="body_{{ $code }}" name="body[{{ $code }}]" rows="8" class="{{ $textarea }}">{{ $tr('body', $code) }}</textarea>
    <x-input-error :messages="$errors->get('body.'.$code)" class="mt-2" />
</div>
