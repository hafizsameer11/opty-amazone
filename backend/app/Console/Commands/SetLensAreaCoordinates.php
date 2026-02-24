<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;

class SetLensAreaCoordinates extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'products:set-lens-coordinates 
                            {product_id : The product ID}
                            {--left-x=27 : Left lens X position (percentage)}
                            {--left-y=45 : Left lens Y position (percentage)}
                            {--left-width=20 : Left lens width (percentage)}
                            {--left-height=22 : Left lens height (percentage)}
                            {--right-x=73 : Right lens X position (percentage)}
                            {--right-y=45 : Right lens Y position (percentage)}
                            {--right-width=20 : Right lens width (percentage)}
                            {--right-height=22 : Right lens height (percentage)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Set lens area coordinates for a product';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $productId = $this->argument('product_id');
        $product = Product::find($productId);

        if (!$product) {
            $this->error("Product with ID {$productId} not found.");
            return Command::FAILURE;
        }

        if (!in_array($product->product_type, ['frame', 'sunglasses'])) {
            $this->error("Product must be a frame or sunglasses type.");
            return Command::FAILURE;
        }

        $coordinates = [
            'left' => [
                'x' => (float) $this->option('left-x'),
                'y' => (float) $this->option('left-y'),
                'width' => (float) $this->option('left-width'),
                'height' => (float) $this->option('left-height'),
                'shape' => 'ellipse',
                'borderRadius' => 50,
            ],
            'right' => [
                'x' => (float) $this->option('right-x'),
                'y' => (float) $this->option('right-y'),
                'width' => (float) $this->option('right-width'),
                'height' => (float) $this->option('right-height'),
                'shape' => 'ellipse',
                'borderRadius' => 50,
            ],
        ];

        $product->lens_area_coordinates = $coordinates;
        $product->save();

        $this->info("Lens area coordinates set for product: {$product->name}");
        $this->table(
            ['Lens', 'X', 'Y', 'Width', 'Height'],
            [
                ['Left', $coordinates['left']['x'], $coordinates['left']['y'], $coordinates['left']['width'], $coordinates['left']['height']],
                ['Right', $coordinates['right']['x'], $coordinates['right']['y'], $coordinates['right']['width'], $coordinates['right']['height']],
            ]
        );

        return Command::SUCCESS;
    }
}

