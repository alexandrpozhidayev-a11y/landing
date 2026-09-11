<x-app-layout>
    <x-slot name="header">
        <div class="flex items-center justify-between">
            <h2 class="font-semibold text-xl text-gray-800 leading-tight">News</h2>
            <a href="{{ route('news.create') }}" class="inline-flex items-center px-4 py-2 bg-gray-800 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-gray-700">
                + Add post
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

            <div class="bg-white shadow-sm sm:rounded-lg overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 text-sm">
                    <thead class="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <tr>
                            <th class="px-6 py-3 w-16"></th>
                            <th class="px-6 py-3">Title</th>
                            <th class="px-6 py-3">Languages</th>
                            <th class="px-6 py-3">Date</th>
                            <th class="px-6 py-3">Status</th>
                            <th class="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        @forelse ($posts as $post)
                            <tr>
                                <td class="px-6 py-3">
                                    @if ($post->image)
                                        <img src="{{ asset('storage/'.$post->image) }}" class="w-12 h-9 rounded object-cover" alt="">
                                    @else
                                        <div class="w-12 h-9 rounded bg-gray-100"></div>
                                    @endif
                                </td>
                                <td class="px-6 py-3 max-w-sm">
                                    <div class="text-gray-900 font-medium truncate">{{ $post->translate('title') }}</div>
                                    <div class="text-xs text-gray-400 truncate">/{{ $post->slug }}</div>
                                </td>
                                <td class="px-6 py-3"><x-locale-badges :filled="$post->filledLocales()" /></td>
                                <td class="px-6 py-3 text-gray-500 whitespace-nowrap">{{ $post->published_at?->format('d.m.Y') ?? '—' }}</td>
                                <td class="px-6 py-3 space-x-1 whitespace-nowrap">
                                    @if ($post->is_published)
                                        <span class="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Published</span>
                                    @else
                                        <span class="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Draft</span>
                                    @endif
                                    @if ($post->is_featured)
                                        <span class="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Main</span>
                                    @endif
                                </td>
                                <td class="px-6 py-3 text-right space-x-3 whitespace-nowrap">
                                    <a href="{{ route('news.edit', $post) }}" class="text-indigo-600 hover:text-indigo-800">Edit</a>
                                    <form action="{{ route('news.destroy', $post) }}" method="POST" class="inline" onsubmit="return confirm('Delete this post?');">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="text-red-600 hover:text-red-800">Delete</button>
                                    </form>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" class="px-6 py-8 text-center text-gray-400">No news posts yet.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            {{ $posts->links() }}
        </div>
    </div>
</x-app-layout>
