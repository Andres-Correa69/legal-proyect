<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_config', function (Blueprint $table) {
            $table->id();
            $table->integer('year')->unique();
            $table->decimal('smmlv', 15, 2)->comment('Salario Mínimo Mensual Legal Vigente');
            $table->decimal('auxilio_transporte', 15, 2)->comment('Auxilio de Transporte');
            $table->decimal('smmlv_previous', 15, 2)->nullable()->comment('SMMLV año anterior');
            $table->decimal('increase_percentage', 5, 2)->nullable()->comment('Porcentaje de incremento');
            $table->string('decree_number')->nullable()->comment('Número del decreto');
            $table->date('effective_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_config');
    }
};
