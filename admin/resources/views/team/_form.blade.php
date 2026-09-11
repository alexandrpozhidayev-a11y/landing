@csrf

@php
    $member ??= null;
    $tr = fn (string $field, string $code) => old("{$field}.{$code}", $member?->{$field}[$code] ?? '');
    $textarea = 'mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm';
@endphp

<x-locale-tabs :fields="['first_name', 'last_name', 'middle_name', 'department', 'role', 'bio']" :render="function (string $code) use ($tr, $textarea, $errors) {
    return view('team._translatable', compact('code', 'tr', 'textarea', 'errors'))->render();
}" />

<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
    <div>
        <x-input-label for="sort_order" value="Order (smaller — earlier on the site)" />
        <x-text-input id="sort_order" name="sort_order" type="number" min="0" class="mt-1 block w-full" value="{{ old('sort_order', $member?->sort_order ?? 0) }}" />
        <x-input-error :messages="$errors->get('sort_order')" class="mt-2" />
    </div>

    <div class="space-y-2 sm:pt-6">
        <label class="flex items-center">
            <input type="checkbox" name="is_published" value="1" class="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500" @checked(old('is_published', $member?->is_published ?? true))>
            <span class="ms-2 text-sm text-gray-600">Visible on the site</span>
        </label>
        <label class="flex items-center">
            <input type="checkbox" name="is_featured" value="1" class="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500" @checked(old('is_featured', $member?->is_featured ?? false))>
            <span class="ms-2 text-sm text-gray-600">Featured (larger card on the Team page)</span>
        </label>
    </div>
</div>

<div>
    <x-input-label for="photo" value="Portrait" />
    @if ($member?->photo)
        <img src="{{ asset('storage/'.$member->photo) }}" class="mt-2 w-24 h-24 object-cover rounded border" alt="">
    @endif
    <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" class="mt-2 block w-full text-sm text-gray-600 file:me-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:uppercase file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200">
    <p class="mt-1 text-xs text-gray-500">JPG, PNG or WebP, up to 5 MB. Without a portrait the site shows the "Portrait to follow" placeholder.</p>
    <x-input-error :messages="$errors->get('photo')" class="mt-2" />
</div>
