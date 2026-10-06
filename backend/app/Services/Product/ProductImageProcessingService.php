<?php

namespace App\Services\Product;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * Calls the private rembg/BiRefNet processor used for Seller catalogue images.
 *
 * The service returns a finished, pure-white WebP. Laravel remains the only
 * component that writes product assets, so public URLs and storage behaviour
 * stay identical for product and variant images across web and mobile apps.
 */
class ProductImageProcessingService
{
    /**
     * Return the processed WebP, or null when local processing is unavailable.
     *
     * A processor outage must never block product creation; the controller will
     * safely store the original upload as its existing fallback behaviour.
     */
    public function process(UploadedFile $image): ?string
    {
        if (! $this->isConfigured()) {
            return null;
        }

        try {
            $contents = file_get_contents($image->getRealPath());

            if ($contents === false) {
                throw new RuntimeException('The uploaded image could not be read.');
            }

            $response = Http::withHeaders([
                'X-Image-Processor-Token' => (string) config('services.product_image_processor.token'),
                'X-Request-Id' => (string) Str::uuid(),
            ])
                ->accept('image/webp')
                ->timeout(max(1, (int) config('services.product_image_processor.timeout', 90)))
                ->attach(
                    'image',
                    $contents,
                    $image->getClientOriginalName() ?: 'product-image'
                )
                ->post($this->endpoint());

            $contentType = strtolower((string) $response->header('Content-Type'));

            if (! $response->successful() || ! str_starts_with($contentType, 'image/webp')) {
                Log::warning('Self-hosted product image processor rejected an upload.', [
                    'status' => $response->status(),
                ]);

                return null;
            }

            return $response->body();
        } catch (Throwable $exception) {
            Log::warning('Self-hosted product image processing failed; storing the original upload instead.', [
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    public function isConfigured(): bool
    {
        return (bool) config('services.product_image_processor.enabled', false)
            && filled(config('services.product_image_processor.url'))
            && filled(config('services.product_image_processor.token'));
    }

    private function endpoint(): string
    {
        return rtrim((string) config('services.product_image_processor.url'), '/')
            .'/v1/catalogue-image';
    }
}
