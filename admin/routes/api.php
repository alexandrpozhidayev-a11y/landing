<?php

use App\Http\Controllers\Api\ContentController;
use Illuminate\Support\Facades\Route;

// Публичное API для сайта (Nuxt): только чтение, только опубликованное.
// Снаружи: https://dc-valley.com/admin/api/... — см. Api\ContentController.
Route::get('team', [ContentController::class, 'team']);
Route::get('news', [ContentController::class, 'news']);
Route::get('news/{slug}', [ContentController::class, 'newsShow']);
