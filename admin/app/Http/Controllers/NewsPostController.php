<?php

namespace App\Http\Controllers;

use App\Models\NewsPost;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class NewsPostController extends Controller
{
    public function index()
    {
        $posts = NewsPost::orderByDesc('published_at')->orderByDesc('id')->paginate(15);

        return view('news.index', compact('posts'));
    }

    public function create()
    {
        return view('news.create');
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $data['slug'] = $this->uniqueSlug($data['title']);

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('news', 'public');
        }

        NewsPost::create($data);

        return redirect()->route('news.index')->with('status', 'News post created.');
    }

    public function edit(NewsPost $news)
    {
        return view('news.edit', ['post' => $news]);
    }

    public function update(Request $request, NewsPost $news)
    {
        $data = $this->validated($request);

        if ($data['title'] !== $news->title) {
            $data['slug'] = $this->uniqueSlug($data['title'], $news->id);
        }

        if ($request->hasFile('image')) {
            if ($news->image) {
                Storage::disk('public')->delete($news->image);
            }
            $data['image'] = $request->file('image')->store('news', 'public');
        }

        $news->update($data);

        return redirect()->route('news.index')->with('status', 'News post updated.');
    }

    public function destroy(NewsPost $news)
    {
        if ($news->image) {
            Storage::disk('public')->delete($news->image);
        }

        $news->delete();

        return redirect()->route('news.index')->with('status', 'News post deleted.');
    }

    private function validated(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string'],
            'body' => ['nullable', 'string'],
            'published_at' => ['nullable', 'date'],
            'is_published' => ['sometimes', 'boolean'],
            'image' => ['nullable', 'image', 'max:4096'],
        ]);

        $validated['is_published'] = $request->boolean('is_published');

        unset($validated['image']);

        return $validated;
    }

    private function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: Str::slug(Str::random(8));
        $slug = $base;
        $i = 1;

        while (
            NewsPost::where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = "{$base}-" . $i++;
        }

        return $slug;
    }
}
