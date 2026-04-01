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
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained()->onDelete('set null');

            // Datos básicos del servicio
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();

            // Clasificación genérica
            $table->string('category')->default('general');

            // Precios
            $table->decimal('price', 10, 2)->default(0);
            $table->decimal('base_price', 10, 2)->nullable();

            // Tiempo y unidad
            $table->integer('estimated_duration')->nullable(); // En minutos
            $table->string('unit')->default('servicio'); // servicio, hora, día, sesión, proyecto, visita, unidad

            // Estado
            $table->boolean('is_active')->default(true);

            // Auditoría de creación
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->onDelete('set null');

            // Auditoría de cambio de precio
            $table->timestamp('last_price_change_at')->nullable();
            $table->foreignId('last_price_change_by')->nullable()->constrained('users')->onDelete('set null');

            $table->timestamps();
            $table->softDeletes();

            // Slug único por empresa
            $table->unique(['company_id', 'slug']);

            // Índices para filtros comunes
            $table->index(['company_id', 'branch_id']);
            $table->index('category');
            $table->index('is_active');
            $table->index('price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
