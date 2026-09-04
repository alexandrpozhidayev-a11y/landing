<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FaqItem extends Model
{
    protected $fillable = [
        'question',
        'answer',
        'list_items',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    /**
     * list_items is stored as one bullet per line; expose it as an array.
     */
    public function getListItemsArrayAttribute(): array
    {
        if (blank($this->list_items)) {
            return [];
        }

        return collect(preg_split('/\r\n|\r|\n/', $this->list_items))
            ->map(fn ($line) => trim($line))
            ->filter()
            ->values()
            ->all();
    }
}
