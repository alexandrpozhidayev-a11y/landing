{{-- Переводимые поля участника команды для одного языка ($code). Вызывается из team/_form. --}}
<div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
    <div>
        <x-input-label for="first_name_{{ $code }}" value="First name" />
        <x-text-input id="first_name_{{ $code }}" name="first_name[{{ $code }}]" type="text" class="mt-1 block w-full" :value="$tr('first_name', $code)" />
        <x-input-error :messages="$errors->get('first_name.'.$code)" class="mt-2" />
    </div>
    <div>
        <x-input-label for="last_name_{{ $code }}" value="Last name" />
        <x-text-input id="last_name_{{ $code }}" name="last_name[{{ $code }}]" type="text" class="mt-1 block w-full" :value="$tr('last_name', $code)" />
        <x-input-error :messages="$errors->get('last_name.'.$code)" class="mt-2" />
    </div>
    <div>
        <x-input-label for="middle_name_{{ $code }}" value="Middle name (optional)" />
        <x-text-input id="middle_name_{{ $code }}" name="middle_name[{{ $code }}]" type="text" class="mt-1 block w-full" :value="$tr('middle_name', $code)" />
        <x-input-error :messages="$errors->get('middle_name.'.$code)" class="mt-2" />
    </div>
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
    <div>
        <x-input-label for="department_{{ $code }}" value="Department (label above the name, e.g. Project leadership)" />
        <x-text-input id="department_{{ $code }}" name="department[{{ $code }}]" type="text" class="mt-1 block w-full" :value="$tr('department', $code)" />
        <x-input-error :messages="$errors->get('department.'.$code)" class="mt-2" />
    </div>
    <div>
        <x-input-label for="role_{{ $code }}" value="Position" />
        <x-text-input id="role_{{ $code }}" name="role[{{ $code }}]" type="text" class="mt-1 block w-full" :value="$tr('role', $code)" />
        <x-input-error :messages="$errors->get('role.'.$code)" class="mt-2" />
    </div>
</div>

<div>
    <x-input-label for="bio_{{ $code }}" value="Short bio" />
    <textarea id="bio_{{ $code }}" name="bio[{{ $code }}]" rows="4" class="{{ $textarea }}">{{ $tr('bio', $code) }}</textarea>
    <x-input-error :messages="$errors->get('bio.'.$code)" class="mt-2" />
</div>
