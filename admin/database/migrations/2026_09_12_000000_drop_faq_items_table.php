<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * FAQ в админке не нужен — только новости и команда. Раздел удалён; таблица
 * могла успеть создаться на сервере при первом деплое — удаляем, если есть.
 * На свежей базе ничего не делает.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('faq_items');
    }

    public function down(): void
    {
        // Раздел FAQ удалён целиком, восстанавливать таблицу незачем.
    }
};
