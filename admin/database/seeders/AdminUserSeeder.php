<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Тестовый администратор админки. Запускается при каждом старте контейнера
 * (docker/entrypoint.sh), но создаёт пользователя только если его ещё нет —
 * пароль, сменённый в профиле, не перезаписывается.
 *
 * В репозитории только bcrypt-хеш пароля; сам пароль передан владельцу отдельно.
 * Пишем в таблицу напрямую, чтобы cast 'hashed' модели не трогал готовый хеш.
 */
class AdminUserSeeder extends Seeder
{
    public const EMAIL = 'admin@dc-valley.com';

    private const PASSWORD_HASH = '$2y$12$VxOBRPXS.qobk43MnpYcx.PWLqZvUpaObB0/A7QHyp8r68Gz.GLqS';

    public function run(): void
    {
        if (DB::table('users')->where('email', self::EMAIL)->exists()) {
            return;
        }

        DB::table('users')->insert([
            'name' => 'Admin',
            'email' => self::EMAIL,
            'password' => self::PASSWORD_HASH,
            'email_verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
