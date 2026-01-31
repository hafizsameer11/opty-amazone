<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Log;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Suppress swagger-php warnings (PathItem, Info, etc.)
        // These are often false positives when using OpenAPI 3.0
        set_error_handler(function ($errno, $errstr, $errfile, $errline) {
            // Suppress swagger-php warnings that are often false positives
            if ((strpos($errstr, 'PathItem') !== false || 
                 strpos($errstr, '@OA\\Info') !== false ||
                 strpos($errstr, 'Required @OA') !== false) && 
                strpos($errfile, 'swagger-php') !== false) {
                return true; // Suppress the error
            }
            return false; // Let other errors through
        }, E_USER_WARNING | E_USER_NOTICE);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
