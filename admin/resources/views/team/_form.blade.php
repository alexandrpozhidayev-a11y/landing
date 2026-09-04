@csrf

<div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
    <div>
        <x-input-label for="last_name" value="Last name" />
        <x-text-input id="last_name" name="last_name" type="text" class="mt-1 block w-full" value="{{ old('last_name', $member->last_name ?? '') }}" required autofocus />
        <x-input-error :messages="$errors->get('last_name')" class="mt-2" />
    </div>
    <div>
        <x-input-label for="first_name" value="First name" />
        <x-text-input id="first_name" name="first_name" type="text" class="mt-1 block w-full" value="{{ old('first_name', $member->first_name ?? '') }}" required />
        <x-input-error :messages="$errors->get('first_name')" class="mt-2" />
    </div>
    <div>
        <x-input-label for="middle_name" value="Middle name" />
        <x-text-input id="middle_name" name="middle_name" type="text" class="mt-1 block w-full" value="{{ old('middle_name', $member->middle_name ?? '') }}" />
        <x-input-error :messages="$errors->get('middle_name')" class="mt-2" />
    </div>
</div>

<div>
    <x-input-label for="role" value="Role / position" />
    <x-text-input id="role" name="role" type="text" class="mt-1 block w-full" value="{{ old('role', $member->role ?? '') }}" />
    <x-input-error :messages="$errors->get('role')" class="mt-2" />
</div>

<div>
    <x-input-label for="bio" value="Bio" />
    <textarea id="bio" name="bio" rows="4" class="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm">{{ old('bio', $member->bio ?? '') }}</textarea>
    <x-input-error :messages="$errors->get('bio')" class="mt-2" />
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
    <div>
        <x-input-label for="sort_order" value="Sort order" />
        <x-text-input id="sort_order" name="sort_order" type="number" class="mt-1 block w-full" value="{{ old('sort_order', $member->sort_order ?? 0) }}" />
        <x-input-error :messages="$errors->get('sort_order')" class="mt-2" />
    </div>

    <div class="flex items-end pb-2">
        <label class="inline-flex items-center">
            <input type="checkbox" name="is_featured" value="1" class="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500" @checked(old('is_featured', $member->is_featured ?? false))>
            <span class="ms-2 text-sm text-gray-600">Featured (larger card on the Team page)</span>
        </label>
    </div>
</div>

<div>
    <x-input-label for="photo" value="Photo" />
    @if (!empty($member) && $member->photo)
        <img src="{{ Storage::url($member->photo) }}" class="mt-2 w-20 h-20 object-cover rounded-full border" alt="">
    @endif
    <input id="photo" name="photo" type="file" accept="image/*" class="mt-2 block w-full text-sm text-gray-600 file:me-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:uppercase file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200">
    <x-input-error :messages="$errors->get('photo')" class="mt-2" />
</div>
