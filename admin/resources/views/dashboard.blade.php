<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Dashboard') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6 text-gray-900">
                    {{ __("You're logged in as :name.", ['name' => Auth::user()->name]) }}
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <a href="{{ route('news.index') }}" class="block bg-white shadow-sm sm:rounded-lg p-6 hover:shadow-md transition">
                    <div class="text-sm text-gray-500">News</div>
                    <div class="mt-1 text-3xl font-semibold text-gray-900">{{ \App\Models\NewsPost::count() }}</div>
                    <div class="mt-2 text-sm text-indigo-600">Manage posts &rarr;</div>
                </a>
                <a href="{{ route('team.index') }}" class="block bg-white shadow-sm sm:rounded-lg p-6 hover:shadow-md transition">
                    <div class="text-sm text-gray-500">Team</div>
                    <div class="mt-1 text-3xl font-semibold text-gray-900">{{ \App\Models\TeamMember::count() }}</div>
                    <div class="mt-2 text-sm text-indigo-600">Manage members &rarr;</div>
                </a>
                <a href="{{ route('faq.index') }}" class="block bg-white shadow-sm sm:rounded-lg p-6 hover:shadow-md transition">
                    <div class="text-sm text-gray-500">FAQ</div>
                    <div class="mt-1 text-3xl font-semibold text-gray-900">{{ \App\Models\FaqItem::count() }}</div>
                    <div class="mt-2 text-sm text-indigo-600">Manage questions &rarr;</div>
                </a>
            </div>
        </div>
    </div>
</x-app-layout>
