<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Язык интерфейса админки: выбранный в переключателе (cookie),
 * иначе — язык браузера, если он есть среди en / kk / ru, иначе английский.
 * Языки те же, что у контента (config/content.php).
 */
class SetAdminLocale
{
    public const COOKIE = 'admin_locale';

    public function handle(Request $request, Closure $next): Response
    {
        $locales = array_keys(config('content.locales'));
        $locale = $request->cookie(self::COOKIE);

        if (! in_array($locale, $locales, true)) {
            $locale = $request->getPreferredLanguage($locales);
        }

        app()->setLocale($locale);

        return $next($request);
    }
}
