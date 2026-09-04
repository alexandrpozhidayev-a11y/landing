<?php

use App\Http\Controllers\FaqItemController;
use App\Http\Controllers\NewsPostController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TeamMemberController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard');

Route::get('/dashboard', function () {
    return view('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::resource('news', NewsPostController::class)->except('show');
    Route::resource('faq', FaqItemController::class)->except('show');
    Route::resource('team', TeamMemberController::class)->parameters(['team' => 'member'])->except('show');
});

require __DIR__.'/auth.php';
