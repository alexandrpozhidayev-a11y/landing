<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class TeamMember extends Model
{
    use HasTranslations;

    /**
     * Поля на en / kk / ru (JSON).
     * department — метка отдела над именем в карточке v2 (напр. "Project leadership"),
     * role — должность, bio — короткая биография.
     */
    protected array $translatable = ['first_name', 'last_name', 'middle_name', 'department', 'role', 'bio'];

    protected $fillable = [
        'first_name',
        'last_name',
        'middle_name',
        'department',
        'role',
        'bio',
        'photo',
        'is_featured',
        'is_published',
        'sort_order',
    ];

    protected $casts = [
        'first_name' => 'array',
        'last_name' => 'array',
        'middle_name' => 'array',
        'department' => 'array',
        'role' => 'array',
        'bio' => 'array',
        'is_featured' => 'boolean',
        'is_published' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }

    /** "Имя Фамилия" на нужном языке — для списков в админке. */
    public function fullName(?string $locale = null): string
    {
        return trim($this->translate('first_name', $locale).' '.$this->translate('last_name', $locale));
    }
}
