<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_type_check");
            DB::statement("ALTER TABLE appointments ADD CONSTRAINT appointments_type_check CHECK (type::text = ANY (ARRAY['appointment'::text, 'reminder'::text, 'follow_up'::text, 'call'::text, 'meeting'::text, 'holiday'::text]))");
        } else {
            // MySQL/MariaDB - DROP CONSTRAINT may fail silently if not exists
            try {
                DB::statement("ALTER TABLE appointments DROP CHECK appointments_type_check");
            } catch (\Exception $e) {
                // Constraint may not exist yet
            }
            DB::statement("ALTER TABLE appointments ADD CONSTRAINT appointments_type_check CHECK (`type` IN ('appointment', 'reminder', 'follow_up', 'call', 'meeting', 'holiday'))");
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_type_check");
            DB::statement("ALTER TABLE appointments ADD CONSTRAINT appointments_type_check CHECK (type::text = ANY (ARRAY['appointment'::text, 'reminder'::text, 'follow_up'::text, 'call'::text, 'meeting'::text]))");
        } else {
            try {
                DB::statement("ALTER TABLE appointments DROP CHECK appointments_type_check");
            } catch (\Exception $e) {
                // Constraint may not exist
            }
            DB::statement("ALTER TABLE appointments ADD CONSTRAINT appointments_type_check CHECK (`type` IN ('appointment', 'reminder', 'follow_up', 'call', 'meeting'))");
        }
    }
};
