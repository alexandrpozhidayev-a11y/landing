<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NewsPost;
use App\Models\TeamMember;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Публичное API для сайта: только чтение и только опубликованное.
 *
 *   GET /admin/api/team
 *   GET /admin/api/news
 *   GET /admin/api/news/{slug}
 *
 * ?locale=en|kk|ru — плоские строки на этом языке (с запасным английским);
 * без параметра — объект {"en": ..., "kk": ..., "ru": ...} на каждое поле.
 */
class ContentController extends Controller
{
    public function team(Request $request): JsonResponse
    {
        $locale = $this->locale($request);

        $members = TeamMember::published()->orderBy('sort_order')->orderBy('id')->get();

        return $this->json($members->map(fn (TeamMember $m) => [
            'id' => $m->id,
            'first_name' => $this->field($m, 'first_name', $locale),
            'last_name' => $this->field($m, 'last_name', $locale),
            'middle_name' => $this->field($m, 'middle_name', $locale),
            'department' => $this->field($m, 'department', $locale),
            'role' => $this->field($m, 'role', $locale),
            'bio' => $this->field($m, 'bio', $locale),
            'photo' => $this->fileUrl($m->photo),
            'is_featured' => $m->is_featured,
            'sort_order' => $m->sort_order,
        ]));
    }

    public function news(Request $request): JsonResponse
    {
        $locale = $this->locale($request);

        $posts = NewsPost::published()->orderByDesc('published_at')->orderByDesc('id')->get();

        return $this->json($posts->map(fn (NewsPost $p) => $this->newsItem($p, $locale)));
    }

    public function newsShow(Request $request, string $slug): JsonResponse
    {
        $locale = $this->locale($request);

        $post = NewsPost::published()->where('slug', $slug)->firstOrFail();

        return $this->json($this->newsItem($post, $locale) + [
            'body' => $this->field($post, 'body', $locale),
        ]);
    }

    private function newsItem(NewsPost $p, ?string $locale): array
    {
        return [
            'id' => $p->id,
            'slug' => $p->slug,
            'title' => $this->field($p, 'title', $locale),
            'excerpt' => $this->field($p, 'excerpt', $locale),
            'image' => $this->fileUrl($p->image),
            'published_at' => $p->published_at?->toDateString(),
            'is_featured' => $p->is_featured,
        ];
    }

    private function locale(Request $request): ?string
    {
        $locale = $request->query('locale');

        return in_array($locale, array_keys(config('content.locales')), true) ? $locale : null;
    }

    private function field(Model $model, string $field, ?string $locale): array|string|null
    {
        return $locale ? $model->translate($field, $locale) : $model->translationsWithFallback($field);
    }

    /** Публичный адрес файла (APP_URL, т.е. https://dc-valley.com/admin/storage/...). */
    private function fileUrl(?string $path): ?string
    {
        return $path ? Storage::disk('public')->url($path) : null;
    }

    private function json(mixed $data): JsonResponse
    {
        return response()->json(['data' => $data])->header('Cache-Control', 'public, max-age=60');
    }
}
