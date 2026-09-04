@csrf

<div>
    <x-input-label for="question" value="Question" />
    <x-text-input id="question" name="question" type="text" class="mt-1 block w-full" value="{{ old('question', $item->question ?? '') }}" required autofocus />
    <x-input-error :messages="$errors->get('question')" class="mt-2" />
</div>

<div>
    <x-input-label for="answer" value="Answer" />
    <textarea id="answer" name="answer" rows="4" class="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm">{{ old('answer', $item->answer ?? '') }}</textarea>
    <x-input-error :messages="$errors->get('answer')" class="mt-2" />
</div>

<div>
    <x-input-label for="list_items" value="Bullet list (optional, one item per line)" />
    <textarea id="list_items" name="list_items" rows="3" class="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm">{{ old('list_items', $item->list_items ?? '') }}</textarea>
    <x-input-error :messages="$errors->get('list_items')" class="mt-2" />
</div>

<div>
    <x-input-label for="sort_order" value="Sort order" />
    <x-text-input id="sort_order" name="sort_order" type="number" class="mt-1 block w-48" value="{{ old('sort_order', $item->sort_order ?? 0) }}" />
    <x-input-error :messages="$errors->get('sort_order')" class="mt-2" />
</div>
