<?php

namespace Tests\Feature;

use App\Models\NewsPost;
use App\Models\TeamMember;
use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminContentTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_is_disabled(): void
    {
        $this->get('/register')->assertNotFound();
        $this->post('/register', ['email' => 'x@y.z'])->assertNotFound();
    }

    public function test_guests_are_sent_to_login(): void
    {
        $this->get('/news')->assertRedirect(route('login'));
        $this->get('/team')->assertRedirect(route('login'));
    }

    public function test_admin_seeder_creates_one_verified_user_and_is_idempotent(): void
    {
        $this->seed(AdminUserSeeder::class);
        $this->seed(AdminUserSeeder::class);

        $this->assertSame(1, User::where('email', AdminUserSeeder::EMAIL)->count());
        $user = User::where('email', AdminUserSeeder::EMAIL)->first();
        $this->assertNotNull($user->email_verified_at);
        $this->assertStringStartsWith('$2y$', $user->password);
    }

    public function test_news_is_saved_with_translations(): void
    {
        Storage::fake('public');

        $this->actingAs(User::factory()->create())
            ->post(route('news.store'), [
                'title' => ['en' => 'Phase one approved', 'kk' => '', 'ru' => 'Первая фаза утверждена'],
                'excerpt' => ['en' => 'Short EN', 'ru' => 'Коротко RU'],
                'body' => ['en' => 'Full EN'],
                'published_at' => '2026-09-01',
                'is_published' => '1',
                'is_featured' => '1',
                'image' => UploadedFile::fake()->image('cover.jpg', 800, 500),
            ])
            ->assertRedirect(route('news.index'));

        $post = NewsPost::firstOrFail();
        $this->assertSame(['en' => 'Phase one approved', 'ru' => 'Первая фаза утверждена'], $post->title);
        $this->assertSame('phase-one-approved', $post->slug);
        $this->assertSame(['en', 'ru'], $post->filledLocales());
        $this->assertTrue($post->is_featured);
        Storage::disk('public')->assertExists($post->image);
    }

    public function test_english_title_is_required(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('news.store'), ['title' => ['ru' => 'Только русский']])
            ->assertSessionHasErrors('title.en');

        $this->assertSame(0, NewsPost::count());
    }

    public function test_only_one_main_news(): void
    {
        $user = User::factory()->create();
        foreach (['First', 'Second'] as $title) {
            $this->actingAs($user)->post(route('news.store'), [
                'title' => ['en' => $title], 'is_published' => '1', 'is_featured' => '1',
            ]);
        }

        $this->assertSame(['Second'], NewsPost::where('is_featured', true)->get()->map->translate('title')->all());
    }

    public function test_team_member_is_saved_with_translations(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('team.store'), [
                'first_name' => ['en' => 'Aidar', 'kk' => 'Айдар', 'ru' => 'Айдар'],
                'last_name' => ['en' => 'Nurlanov', 'ru' => 'Нурланов'],
                'department' => ['en' => 'Project leadership', 'ru' => 'Руководство проекта'],
                'role' => ['en' => 'CEO'],
                'bio' => ['en' => 'Bio EN'],
                'sort_order' => '2',
                'is_published' => '1',
            ])
            ->assertRedirect(route('team.index'));

        $member = TeamMember::firstOrFail();
        $this->assertSame('Aidar Nurlanov', $member->fullName());
        $this->assertSame('Айдар Нурланов', $member->fullName('ru'));
        $this->assertSame('Айдар Nurlanov', $member->fullName('kk'), 'kk last name falls back to English');
        $this->assertSame(2, $member->sort_order);
    }

    public function test_api_returns_published_content_with_english_fallback(): void
    {
        NewsPost::create([
            'title' => ['en' => 'Hello', 'ru' => 'Привет'], 'slug' => 'hello',
            'excerpt' => ['en' => 'Short'], 'body' => ['en' => 'Body EN', 'ru' => 'Текст'],
            'published_at' => '2026-09-01', 'is_published' => true,
        ]);
        NewsPost::create(['title' => ['en' => 'Draft'], 'slug' => 'draft', 'is_published' => false]);
        TeamMember::create([
            'first_name' => ['en' => 'Dana'], 'last_name' => ['en' => 'Sadykova', 'kk' => 'Садықова'],
            'is_published' => true,
        ]);
        TeamMember::create(['first_name' => ['en' => 'Hidden'], 'last_name' => ['en' => 'Person'], 'is_published' => false]);

        $this->getJson('/api/news?locale=ru')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Привет')
            ->assertJsonPath('data.0.excerpt', 'Short')      // ru нет -> английский
            ->assertJsonMissingPath('data.0.body');

        $this->getJson('/api/news?locale=kk')->assertJsonPath('data.0.title', 'Hello');

        $this->getJson('/api/news')
            ->assertJsonPath('data.0.title', ['en' => 'Hello', 'kk' => 'Hello', 'ru' => 'Привет']);

        $this->getJson('/api/news/hello?locale=ru')->assertOk()->assertJsonPath('data.body', 'Текст');
        $this->getJson('/api/news/draft')->assertNotFound();

        $this->getJson('/api/team?locale=kk')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.last_name', 'Садықова')
            ->assertJsonPath('data.0.first_name', 'Dana');
    }
}
