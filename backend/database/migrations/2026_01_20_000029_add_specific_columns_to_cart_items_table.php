<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            // Check and add variant_id if it doesn't exist
            if (!Schema::hasColumn('cart_items', 'variant_id')) {
                $table->foreignId('variant_id')->nullable()->after('product_id')->constrained('product_variants')->onDelete('set null');
            }

            // Frame size reference
            if (!Schema::hasColumn('cart_items', 'frame_size_id')) {
                $table->foreignId('frame_size_id')->nullable()->after('variant_id')->constrained('frame_sizes')->onDelete('set null');
            }

            // Prescription reference
            if (!Schema::hasColumn('cart_items', 'prescription_id')) {
                $table->foreignId('prescription_id')->nullable()->after('frame_size_id')->constrained('prescriptions')->onDelete('set null');
            }

            // Lens customization fields
            if (!Schema::hasColumn('cart_items', 'lens_index')) {
                $table->decimal('lens_index', 3, 2)->nullable()->after('prescription_id');
            }
            if (!Schema::hasColumn('cart_items', 'lens_type')) {
                $table->string('lens_type', 50)->nullable()->after('lens_index');
            }
            if (!Schema::hasColumn('cart_items', 'lens_thickness_material_id')) {
                $table->foreignId('lens_thickness_material_id')->nullable()->after('lens_type')->constrained('lens_thickness_materials')->onDelete('set null');
            }
            if (!Schema::hasColumn('cart_items', 'lens_thickness_option_id')) {
                $table->foreignId('lens_thickness_option_id')->nullable()->after('lens_thickness_material_id')->constrained('lens_thickness_options')->onDelete('set null');
            }
            if (!Schema::hasColumn('cart_items', 'treatment_ids')) {
                $table->json('treatment_ids')->nullable()->after('lens_thickness_option_id'); // Array of lens_treatment IDs
            }
            if (!Schema::hasColumn('cart_items', 'lens_coatings')) {
                $table->text('lens_coatings')->nullable()->after('treatment_ids'); // JSON or comma-separated
            }

            // Lens color options (nullable - tables may not exist yet)
            if (!Schema::hasColumn('cart_items', 'photochromic_color_id')) {
                $table->unsignedBigInteger('photochromic_color_id')->nullable()->after('lens_coatings');
            }
            if (!Schema::hasColumn('cart_items', 'prescription_sun_color_id')) {
                $table->unsignedBigInteger('prescription_sun_color_id')->nullable()->after('photochromic_color_id');
            }

            // Progressive lens variant (nullable - table may not exist yet)
            if (!Schema::hasColumn('cart_items', 'progressive_variant_id')) {
                $table->unsignedBigInteger('progressive_variant_id')->nullable()->after('prescription_sun_color_id');
            }

            // Contact lens specific fields (left eye)
            if (!Schema::hasColumn('cart_items', 'contact_lens_left_base_curve')) {
                $table->decimal('contact_lens_left_base_curve', 5, 2)->nullable()->after('progressive_variant_id');
            }
            if (!Schema::hasColumn('cart_items', 'contact_lens_left_diameter')) {
                $table->decimal('contact_lens_left_diameter', 5, 2)->nullable()->after('contact_lens_left_base_curve');
            }
            if (!Schema::hasColumn('cart_items', 'contact_lens_left_power')) {
                $table->decimal('contact_lens_left_power', 5, 2)->nullable()->after('contact_lens_left_diameter');
            }
            if (!Schema::hasColumn('cart_items', 'contact_lens_left_qty')) {
                $table->integer('contact_lens_left_qty')->nullable()->after('contact_lens_left_power');
            }

            // Contact lens specific fields (right eye)
            if (!Schema::hasColumn('cart_items', 'contact_lens_right_base_curve')) {
                $table->decimal('contact_lens_right_base_curve', 5, 2)->nullable()->after('contact_lens_left_qty');
            }
            if (!Schema::hasColumn('cart_items', 'contact_lens_right_diameter')) {
                $table->decimal('contact_lens_right_diameter', 5, 2)->nullable()->after('contact_lens_right_base_curve');
            }
            if (!Schema::hasColumn('cart_items', 'contact_lens_right_power')) {
                $table->decimal('contact_lens_right_power', 5, 2)->nullable()->after('contact_lens_right_diameter');
            }
            if (!Schema::hasColumn('cart_items', 'contact_lens_right_qty')) {
                $table->integer('contact_lens_right_qty')->nullable()->after('contact_lens_right_power');
            }
        });

        // Add indexes separately to avoid issues
        Schema::table('cart_items', function (Blueprint $table) {
            if (Schema::hasColumn('cart_items', 'variant_id') && !$this->hasIndex('cart_items', 'cart_items_variant_id_index')) {
                $table->index('variant_id');
            }
            if (Schema::hasColumn('cart_items', 'frame_size_id') && !$this->hasIndex('cart_items', 'cart_items_frame_size_id_index')) {
                $table->index('frame_size_id');
            }
            if (Schema::hasColumn('cart_items', 'prescription_id') && !$this->hasIndex('cart_items', 'cart_items_prescription_id_index')) {
                $table->index('prescription_id');
            }
        });
    }

    private function hasIndex($table, $indexName): bool
    {
        $connection = Schema::getConnection();
        $database = $connection->getDatabaseName();
        $result = $connection->select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$indexName]);
        return count($result) > 0;
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropForeign(['variant_id']);
            $table->dropForeign(['frame_size_id']);
            $table->dropForeign(['prescription_id']);
            $table->dropForeign(['lens_thickness_material_id']);
            $table->dropForeign(['lens_thickness_option_id']);

            $table->dropColumn([
                'variant_id',
                'frame_size_id',
                'prescription_id',
                'lens_index',
                'lens_type',
                'lens_thickness_material_id',
                'lens_thickness_option_id',
                'treatment_ids',
                'lens_coatings',
                'photochromic_color_id',
                'prescription_sun_color_id',
                'progressive_variant_id',
                'contact_lens_left_base_curve',
                'contact_lens_left_diameter',
                'contact_lens_left_power',
                'contact_lens_left_qty',
                'contact_lens_right_base_curve',
                'contact_lens_right_diameter',
                'contact_lens_right_power',
                'contact_lens_right_qty',
            ]);
        });
    }
};

