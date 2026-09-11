@csrf

@php
    $post ??= null;
    $tr = fn (string $field, string $code) => old("{$field}.{$code}", $post?->{$field}[$code] ?? '');
    $textarea = 'mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm';
@endphp

<x-locale-tabs :fields="['title', 'excerpt', 'body']" :render="function (string $code) use ($tr, $textarea, $errors) {
    return view('news._translatable', compact('code', 'tr', 'textarea', 'errors'))->render();
}" />

<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
    <div>
        <x-input-label for="published_at" value="Date" />
        <x-text-input id="published_at" name="published_at" type="date" class="mt-1 block w-full"
                      value="{{ old('published_at', $post ? $post->published_at?->format('Y-m-d') : now()->format('Y-m-d')) }}" />
        <x-input-error :messages="$errors->get('published_at')" class="mt-2" />
    </div>

    <div class="space-y-2 sm:pt-6">
        <label class="flex items-center">
            <input type="checkbox" name="is_published" value="1" class="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500" @checked(old('is_published', $post?->is_published ?? false))>
            <span class="ms-2 text-sm text-gray-600">Published (visible on the site)</span>
        </label>
        <label class="flex items-center">
            <input type="checkbox" name="is_featured" value="1" class="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500" @checked(old('is_featured', $post?->is_featured ?? false))>
            <span class="ms-2 text-sm text-gray-600">Main news (large card on the News page — only one)</span>
        </label>
    </div>
</div>

<div>
    <x-input-label for="image" value="Cover image" />
    @if ($post?->image)
        <img src="{{ asset('storage/'.$post->image) }}" class="mt-2 w-40 h-24 object-cover rounded border" alt="">
    @endif
    <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" class="mt-2 block w-full text-sm text-gray-600 file:me-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:uppercase file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200">
    <p class="mt-1 text-xs text-gray-500">JPG, PNG or WebP, up to 5 MB.</p>
    <x-input-error :messages="$errors->get('image')" class="mt-2" />
</div>
