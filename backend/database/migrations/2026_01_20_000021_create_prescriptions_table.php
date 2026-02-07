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
        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('prescription_type', ['single_vision', 'bifocal', 'trifocal', 'progressive'])->default('single_vision');
            
            // Right Eye (OD) - Oculus Dexter
            $table->decimal('od_sphere', 5, 2)->nullable();
            $table->decimal('od_cylinder', 5, 2)->nullable();
            $table->integer('od_axis')->nullable();
            $table->decimal('od_add', 5, 2)->nullable(); // Addition for reading
            
            // Left Eye (OS) - Oculus Sinister
            $table->decimal('os_sphere', 5, 2)->nullable();
            $table->decimal('os_cylinder', 5, 2)->nullable();
            $table->integer('os_axis')->nullable();
            $table->decimal('os_add', 5, 2)->nullable(); // Addition for reading
            
            // Pupillary Distance (PD)
            $table->decimal('pd_binocular', 5, 2)->nullable(); // Both eyes together
            $table->decimal('pd_monocular_od', 5, 2)->nullable(); // Right eye only
            $table->decimal('pd_monocular_os', 5, 2)->nullable(); // Left eye only
            $table->decimal('pd_near', 5, 2)->nullable(); // Near vision PD
            
            // Prism (PH)
            $table->decimal('ph_od', 5, 2)->nullable(); // Prism horizontal for right eye
            $table->decimal('ph_os', 5, 2)->nullable(); // Prism horizontal for left eye
            
            // Doctor Information
            $table->string('doctor_name', 255)->nullable();
            $table->string('doctor_license', 100)->nullable();
            $table->dateTime('prescription_date')->nullable();
            $table->dateTime('expiry_date')->nullable();
            
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_verified')->default(false);
            $table->timestamps();
            
            $table->index('user_id');
            $table->index('is_active');
            $table->index(['user_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prescriptions');
    }
};

