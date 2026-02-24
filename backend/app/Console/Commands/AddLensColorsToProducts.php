<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;

class AddLensColorsToProducts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'products:add-lens-colors {--force : Force update even if lens colors exist}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Add lens colors to existing frame and sunglasses products';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Common lens colors for glasses
        $lensColors = [
            [
                'id' => 1,
                'name' => 'Clear',
                'color_code' => '#FFFFFF',
                'description' => 'Transparent clear lenses',
            ],
            [
                'id' => 2,
                'name' => 'Blue',
                'color_code' => '#4A90E2',
                'description' => 'Blue tinted lenses',
            ],
            [
                'id' => 3,
                'name' => 'Green',
                'color_code' => '#50C878',
                'description' => 'Green tinted lenses',
            ],
            [
                'id' => 4,
                'name' => 'Brown',
                'color_code' => '#8B4513',
                'description' => 'Brown tinted lenses',
            ],
            [
                'id' => 5,
                'name' => 'Gray',
                'color_code' => '#808080',
                'description' => 'Gray tinted lenses',
            ],
            [
                'id' => 6,
                'name' => 'Rose',
                'color_code' => '#FF69B4',
                'description' => 'Rose tinted lenses',
            ],
            [
                'id' => 7,
                'name' => 'Yellow',
                'color_code' => '#FFD700',
                'description' => 'Yellow tinted lenses for enhanced contrast',
            ],
            [
                'id' => 8,
                'name' => 'Mirror',
                'color_code' => '#C0C0C0',
                'description' => 'Mirror finish lenses',
            ],
        ];

        // Get all frame and sunglasses products
        $query = Product::whereIn('product_type', ['frame', 'sunglasses'])
            ->where('is_active', true);

        if (!$this->option('force')) {
            $query->where(function($q) {
                $q->whereNull('lens_colors')
                  ->orWhereJsonLength('lens_colors', 0);
            });
        }

        $products = $query->get();

        $this->info("Found {$products->count()} products to update with lens colors.");

        if ($products->isEmpty()) {
            $this->warn('No products found to update. Use --force to update all products.');
            return Command::SUCCESS;
        }

        $bar = $this->output->createProgressBar($products->count());
        $bar->start();

        $updated = 0;
        foreach ($products as $product) {
            // For sunglasses, use darker/mirror colors
            // For frames, use all colors
            $colorsToAdd = $product->product_type === 'sunglasses'
                ? array_slice($lensColors, 0, 6) // First 6 colors (excluding yellow and mirror for most)
                : $lensColors; // All colors for frames

            // Randomly select 4-6 colors for variety
            $selectedColors = fake()->randomElements($colorsToAdd, fake()->numberBetween(4, min(6, count($colorsToAdd))));

            $product->lens_colors = $selectedColors;
            $product->save();

            $updated++;
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("Successfully added lens colors to {$updated} products.");
        $this->info("Lens colors available:");
        foreach ($lensColors as $color) {
            $this->line("  - {$color['name']} ({$color['color_code']})");
        }

        return Command::SUCCESS;
    }
}

