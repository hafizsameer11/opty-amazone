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
        Schema::table('products', function (Blueprint $table) {
            // Contact Lens Specific Fields
            $table->text('base_curve_options')->nullable()->after('treatment_options');
            $table->text('diameter_options')->nullable()->after('base_curve_options');
            $table->text('powers_range')->nullable()->after('diameter_options');
            $table->string('replacement_frequency', 50)->nullable()->after('powers_range');
            $table->string('contact_lens_brand', 100)->nullable()->after('replacement_frequency');
            $table->string('contact_lens_color', 100)->nullable()->after('contact_lens_brand');
            $table->string('contact_lens_material', 100)->nullable()->after('contact_lens_color');
            $table->string('contact_lens_type', 50)->nullable()->after('contact_lens_material');
            $table->boolean('has_uv_filter')->default(false)->after('contact_lens_type');
            $table->boolean('can_sleep_with')->default(false)->after('has_uv_filter');
            $table->string('water_content', 50)->nullable()->after('can_sleep_with');
            $table->boolean('is_medical_device')->default(true)->after('water_content');
            
            // Eye Hygiene Specific Fields
            $table->string('size_volume', 50)->nullable()->after('is_medical_device');
            $table->string('pack_type', 50)->nullable()->after('size_volume');
            $table->dateTime('expiry_date')->nullable()->after('pack_type');
            
            // Additional Fields
            $table->string('model_3d_url', 500)->nullable()->after('expiry_date');
            $table->string('try_on_image', 500)->nullable()->after('model_3d_url');
            $table->json('color_images')->nullable()->after('try_on_image');
            $table->json('mm_calibers')->nullable()->after('color_images');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'base_curve_options',
                'diameter_options',
                'powers_range',
                'replacement_frequency',
                'contact_lens_brand',
                'contact_lens_color',
                'contact_lens_material',
                'contact_lens_type',
                'has_uv_filter',
                'can_sleep_with',
                'water_content',
                'is_medical_device',
                'size_volume',
                'pack_type',
                'expiry_date',
                'model_3d_url',
                'try_on_image',
                'color_images',
                'mm_calibers',
            ]);
        });
    }
};

