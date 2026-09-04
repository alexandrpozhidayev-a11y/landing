@csrf

<div>
    <x-input-label for="title" value="Title" />
    <x-text-input id="title" name="title" type="text" class="mt-1 block w-full" value="{{ old('title', $post->title ?? '') }}" required autofocus />
    <x-input-error :messages="$errors->get('title')" class="mt-2" />
</div>

<div>
    <x-input-label for="excerpt" value="Excerpt (short summary shown in lists)" />
    <textarea id="excerpt" name="excerpt" rows="3" class="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm">{{ old('excerpt', $post->excerpt ?? '') }}</textarea>
    <x-input-error :messages="$errors->get('excerpt')" class="mt-2" />
</div>

<div>
    <x-input-label for="body" value="Full text" />
    <textarea id="body" name="body" rows="6" class="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm">{{ old('body', $post->body ?? '') }}</textarea>
    <x-input-error :messages="$errors->get('body')" class="mt-2" />
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
    <div>
        <x-input-label for="published_at" value="Publish date" />
        <x-text-input id="published_at" name="published_at" type="date" class="mt-1 block w-full" value="{{ old('published_at', isset($post) && $post->published_at ? $post->published_at->format('Y-m-d') : '') }}" />
        <x-input-error :messages="$errors->get('published_at')" class="mt-2" />
    </div>

    <div class="flex items-end pb-2">
        <label class="inline-flex items-center">
            <input type="checkbox" name="is_published" value="1" class="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500" @checked(old('is_published', $post->is_published ?? false))>
            <span class="ms-2 text-sm text-gray-600">Published (visible on the site)</span>
        </label>
    </div>
</div>

<div>
    <x-input-label for="image" value="Cover image" />
    @if (!empty($post) && $post->image)
        <img src="{{ Storage::url($post->image) }}" class="mt-2 w-32 h-20 object-cover rounded border" alt="">
    @endif
    <input id="image" name="image" type="file" accept="image/*" class="mt-2 block w-full text-sm text-gray-600 file:me-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:uppercase file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200">
    <x-input-error :messages="$errors->get('image')" class="mt-2" />
</div>
