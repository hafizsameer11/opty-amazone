<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sanctum: allow stateful frontend requests if we ever use cookie-based auth
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        // Our API is token-based (Sanctum personal access tokens), so CSRF protection
        // is not required for any /api/* routes. Disable CSRF validation for them to
        // avoid \"CSRF token mismatch\" errors when calling JSON APIs from Next.js.
        $middleware->validateCsrfTokens(
            except: [
                'api/*',
            ]
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
