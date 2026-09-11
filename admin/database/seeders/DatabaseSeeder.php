<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Только тестовый администратор (без демо-пользователей с паролем "password").
        $this->call(AdminUserSeeder::class);
    }
}
