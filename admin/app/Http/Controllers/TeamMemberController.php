<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\TranslatableFields;
use App\Models\TeamMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TeamMemberController extends Controller
{
    use TranslatableFields;

    public function index()
    {
        $members = TeamMember::orderBy('sort_order')->orderBy('id')->paginate(20);

        return view('team.index', compact('members'));
    }

    public function create()
    {
        return view('team.create');
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        if ($request->hasFile('photo')) {
            $data['photo'] = $request->file('photo')->store('team', 'public');
        }

        TeamMember::create($data);

        return redirect()->route('team.index')->with('status', 'Team member created.');
    }

    public function edit(TeamMember $member)
    {
        return view('team.edit', compact('member'));
    }

    public function update(Request $request, TeamMember $member)
    {
        $data = $this->validated($request);

        if ($request->hasFile('photo')) {
            if ($member->photo) {
                Storage::disk('public')->delete($member->photo);
            }
            $data['photo'] = $request->file('photo')->store('team', 'public');
        }

        $member->update($data);

        return redirect()->route('team.index')->with('status', 'Team member updated.');
    }

    public function destroy(TeamMember $member)
    {
        if ($member->photo) {
            Storage::disk('public')->delete($member->photo);
        }

        $member->delete();

        return redirect()->route('team.index')->with('status', 'Team member deleted.');
    }

    private function validated(Request $request): array
    {
        $default = TeamMember::defaultLocale();

        $validated = $request->validate([
            'first_name' => ['required', 'array'],
            "first_name.{$default}" => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'array'],
            "last_name.{$default}" => ['required', 'string', 'max:255'],
            'first_name.*' => ['nullable', 'string', 'max:255'],
            'last_name.*' => ['nullable', 'string', 'max:255'],
            'middle_name' => ['nullable', 'array'],
            'middle_name.*' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'array'],
            'department.*' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'array'],
            'role.*' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'array'],
            'bio.*' => ['nullable', 'string', 'max:5000'],
            'is_featured' => ['sometimes', 'boolean'],
            'is_published' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ], [], $this->translatableAttributes([
            'first_name' => 'First name',
            'last_name' => 'Last name',
            'middle_name' => 'Middle name',
            'department' => 'Department',
            'role' => 'Position',
            'bio' => 'Short bio',
        ]));

        $data = [];
        foreach (['first_name', 'last_name', 'middle_name', 'department', 'role', 'bio'] as $field) {
            $data[$field] = TeamMember::cleanTranslations($validated[$field] ?? []);
        }

        return $data + [
            'is_featured' => $request->boolean('is_featured'),
            'is_published' => $request->boolean('is_published'),
            'sort_order' => $validated['sort_order'] ?? 0,
        ];
    }
}
