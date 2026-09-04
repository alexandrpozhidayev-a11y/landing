<?php

namespace App\Http\Controllers;

use App\Models\TeamMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TeamMemberController extends Controller
{
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
        $validated = $request->validate([
            'last_name' => ['required', 'string', 'max:255'],
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string'],
            'is_featured' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
            'photo' => ['nullable', 'image', 'max:4096'],
        ]);

        $validated['is_featured'] = $request->boolean('is_featured');
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        unset($validated['photo']);

        return $validated;
    }
}
