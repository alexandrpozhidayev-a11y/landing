<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\TranslatableFields;
use App\Models\NewsPost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class NewsPostController extends Controller
{
    use TranslatableFields;

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

        $data['slug'] = $this->uniqueSlug($data['title'][NewsPost::defaultLocale()]);

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('news', 'public');
        }

        $post = NewsPost::create($data);
        $this->keepSingleFeatured($post);

        return redirect()->route('news.index')->with('status', 'News post created.');
    }

    public function edit(NewsPost $news)
    {
        return view('news.edit', ['post' => $news]);
    }

    public function update(Request $request, NewsPost $news)
    {
        $data = $this->validated($request);

        $title = $data['title'][NewsPost::defaultLocale()];
        if ($title !== $news->translate('title')) {
            $data['slug'] = $this->uniqueSlug($title, $news->id);
        }

        if ($request->hasFile('image')) {
            if ($news->image) {
                Storage::disk('public')->delete($news->image);
            }
            $data['image'] = $request->file('image')->store('news', 'public');
        }

        $news->update($data);
        $this->keepSingleFeatured($news);

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
        $default = NewsPost::defaultLocale();

        $validated = $request->validate([
            'title' => ['required', 'array'],
            "title.{$default}" => ['required', 'string', 'max:255'],
            'title.*' => ['nullable', 'string', 'max:255'],
            'excerpt' => ['nullable', 'array'],
            'excerpt.*' => ['nullable', 'string', 'max:1000'],
            'body' => ['nullable', 'array'],
            'body.*' => ['nullable', 'string', 'max:50000'],
            'published_at' => ['nullable', 'date'],
            'is_published' => ['sometimes', 'boolean'],
            'is_featured' => ['sometimes', 'boolean'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ], [], $this->translatableAttributes([
            'title' => 'Title',
            'excerpt' => 'Short text',
            'body' => 'Full text',
        ]));

        return [
            'title' => NewsPost::cleanTranslations($validated['title']),
            'excerpt' => NewsPost::cleanTranslations($validated['excerpt'] ?? []),
            'body' => NewsPost::cleanTranslations($validated['body'] ?? []),
            'published_at' => $validated['published_at'] ?? null,
            'is_published' => $request->boolean('is_published'),
            'is_featured' => $request->boolean('is_featured'),
        ];
    }

    /** Главная новость (крупная карточка на сайте) — только одна. */
    private function keepSingleFeatured(NewsPost $post): void
    {
        if ($post->is_featured) {
            NewsPost::whereKeyNot($post->id)->where('is_featured', true)->update(['is_featured' => false]);
        }
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
            $slug = "{$base}-".$i++;
        }

        return $slug;
    }
}
