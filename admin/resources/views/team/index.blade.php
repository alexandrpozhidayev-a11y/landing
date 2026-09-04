<x-app-layout>
    <x-slot name="header">
        <div class="flex items-center justify-between">
            <h2 class="font-semibold text-xl text-gray-800 leading-tight">Team</h2>
            <a href="{{ route('team.create') }}" class="inline-flex items-center px-4 py-2 bg-gray-800 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-gray-700">
                + Add member
            </a>
        </div>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-4">
            @if (session('status'))
                <div class="rounded-md bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
                    {{ session('status') }}
                </div>
            @endif

            <div class="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200 text-sm">
                    <thead class="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <tr>
                            <th class="px-6 py-3 w-16"></th>
                            <th class="px-6 py-3">Name</th>
                            <th class="px-6 py-3">Role</th>
                            <th class="px-6 py-3">Featured</th>
                            <th class="px-6 py-3">Order</th>
                            <th class="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        @forelse ($members as $member)
                            <tr>
                                <td class="px-6 py-3">
                                    @if ($member->photo)
                                        <img src="{{ Storage::url($member->photo) }}" class="w-10 h-10 rounded-full object-cover" alt="">
                                    @else
                                        <div class="w-10 h-10 rounded-full bg-gray-100"></div>
                                    @endif
                                </td>
                                <td class="px-6 py-3 text-gray-900 font-medium">{{ trim("{$member->last_name} {$member->first_name} {$member->middle_name}") }}</td>
                                <td class="px-6 py-3 text-gray-500">{{ $member->role }}</td>
                                <td class="px-6 py-3">
                                    @if ($member->is_featured)
                                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">Featured</span>
                                    @else
                                        <span class="text-gray-300">—</span>
                                    @endif
                                </td>
                                <td class="px-6 py-3 text-gray-500">{{ $member->sort_order }}</td>
                                <td class="px-6 py-3 text-right space-x-3">
                                    <a href="{{ route('team.edit', $member) }}" class="text-indigo-600 hover:text-indigo-800">Edit</a>
                                    <form action="{{ route('team.destroy', $member) }}" method="POST" class="inline" onsubmit="return confirm('Delete this member?');">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="text-red-600 hover:text-red-800">Delete</button>
                                    </form>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" class="px-6 py-8 text-center text-gray-400">No team members yet.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            {{ $members->links() }}
        </div>
    </div>
</x-app-layout>
