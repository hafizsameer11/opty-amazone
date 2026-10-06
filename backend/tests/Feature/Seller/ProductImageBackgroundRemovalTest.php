<?php

namespace Tests\Feature\Seller;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductImageBackgroundRemovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_upload_is_extracted_and_composed_on_a_white_catalogue_canvas(): void
    {
        Storage::fake('public');
        $this->actingSeller();
        config([
            'services.product_image_processor.enabled' => true,
            'services.product_image_processor.token' => 'test-image-processor-token',
            'services.product_image_processor.url' => 'http://image-processor.test',
        ]);

        Http::fake([
            'http://image-processor.test/v1/catalogue-image' => Http::response(
                $this->whiteCatalogueWebp(),
                200,
                ['Content-Type' => 'image/webp']
            ),
        ]);

        $response = $this->post('/api/seller/products/upload-image', [
            'image' => UploadedFile::fake()->image('frame.jpg', 320, 240),
        ])->assertOk()
            ->assertJsonPath('data.background_processed', true);

        $path = $response->json('data.path');

        $this->assertIsString($path);
        $this->assertStringEndsWith('.webp', $path);
        Storage::disk('public')->assertExists($path);

        $catalogue = imagecreatefromstring(Storage::disk('public')->get($path));
        $this->assertNotFalse($catalogue);

        try {
            $corner = imagecolorsforindex($catalogue, imagecolorat($catalogue, 0, 0));
            $this->assertSame(255, $corner['red']);
            $this->assertSame(255, $corner['green']);
            $this->assertSame(255, $corner['blue']);
            $this->assertTrue($this->containsRedProductPixels($catalogue));
        } finally {
            imagedestroy($catalogue);
        }

        Http::assertSent(function (Request $request): bool {
            return $request->url() === 'http://image-processor.test/v1/catalogue-image'
                && $request->hasHeader('X-Image-Processor-Token', 'test-image-processor-token')
                && $request->hasHeader('Accept', 'image/webp');
        });
    }

    public function test_upload_keeps_working_when_background_processing_is_not_configured(): void
    {
        Storage::fake('public');
        $this->actingSeller();
        config([
            'services.product_image_processor.enabled' => true,
            'services.product_image_processor.token' => null,
        ]);

        $response = $this->post('/api/seller/products/upload-image', [
            'image' => UploadedFile::fake()->image('frame.jpg', 320, 240),
        ])->assertOk()
            ->assertJsonPath('data.background_processed', false);

        Storage::disk('public')->assertExists($response->json('data.path'));
        Http::assertNothingSent();
    }

    private function actingSeller(): void
    {
        $seller = User::factory()->seller()->create();

        Store::create([
            'user_id' => $seller->id,
            'name' => 'Image Studio',
            'slug' => (string) Str::uuid(),
            'status' => 'active',
            'is_active' => true,
        ]);

        Sanctum::actingAs($seller, ['seller']);
    }

    private function whiteCatalogueWebp(): string
    {
        $image = imagecreatetruecolor(20, 20);
        $white = imagecolorallocate($image, 255, 255, 255);
        imagefill($image, 0, 0, $white);
        $red = imagecolorallocatealpha($image, 220, 10, 20, 0);
        imagefilledrectangle($image, 4, 8, 15, 11, $red);

        ob_start();
        imagewebp($image, null, 90);
        $webp = ob_get_clean();
        imagedestroy($image);

        $this->assertIsString($webp);

        return $webp;
    }

    private function containsRedProductPixels(\GdImage $image): bool
    {
        for ($y = 0; $y < imagesy($image); $y++) {
            for ($x = 0; $x < imagesx($image); $x++) {
                $pixel = imagecolorsforindex($image, imagecolorat($image, $x, $y));

                if ($pixel['red'] > 180 && $pixel['green'] < 80 && $pixel['blue'] < 80) {
                    return true;
                }
            }
        }

        return false;
    }
}
