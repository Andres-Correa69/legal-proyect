<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->nullable()->after('name');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('business_name')->nullable()->after('last_name');
            $table->string('legal_representative')->nullable()->after('business_name');
            $table->string('gender', 20)->nullable()->after('birth_date');
            $table->string('occupation', 100)->nullable()->after('gender');
            $table->string('whatsapp_country', 10)->nullable()->after('phone');
            $table->string('whatsapp_number', 30)->nullable()->after('whatsapp_country');
            $table->string('neighborhood', 150)->nullable()->after('city_name');
            $table->string('commune', 100)->nullable()->after('neighborhood');
            $table->string('referral_source', 100)->nullable()->after('commune');
            $table->string('contact_preference', 50)->nullable()->after('referral_source');
            $table->string('preferred_schedule', 50)->nullable()->after('contact_preference');
            $table->text('observations')->nullable()->after('preferred_schedule');
            $table->json('tags')->nullable()->after('observations');
            $table->json('social_networks')->nullable()->after('tags');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'first_name',
                'last_name',
                'business_name',
                'legal_representative',
                'gender',
                'occupation',
                'whatsapp_country',
                'whatsapp_number',
                'neighborhood',
                'commune',
                'referral_source',
                'contact_preference',
                'preferred_schedule',
                'observations',
                'tags',
                'social_networks',
            ]);
        });
    }
};
