<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CleanupTempRegistrations extends Command
{
    protected $signature = 'registrations:cleanup';
    protected $description = 'Elimina archivos temporales de registros abandonados (mayores a 24 horas)';

    public function handle(): int
    {
        $basePath = 'temp/registrations';
        $disk = Storage::disk('s3');

        try {
            $directories = $disk->directories($basePath);
            $cleaned = 0;

            foreach ($directories as $dir) {
                $files = $disk->files($dir);

                if (empty($files)) {
                    $disk->deleteDirectory($dir);
                    $cleaned++;
                    continue;
                }

                // Verificar la fecha del archivo mas reciente en la carpeta
                $latestTimestamp = 0;
                foreach ($files as $file) {
                    $timestamp = $disk->lastModified($file);
                    if ($timestamp > $latestTimestamp) {
                        $latestTimestamp = $timestamp;
                    }
                }

                // Eliminar si la carpeta tiene mas de 24 horas
                if ($latestTimestamp > 0 && $latestTimestamp < now()->subHours(24)->timestamp) {
                    $disk->deleteDirectory($dir);
                    $cleaned++;

                    Log::info('Carpeta temporal de registro eliminada', [
                        'path' => $dir,
                    ]);
                }
            }

            $this->info("Se limpiaron {$cleaned} carpetas temporales de registro.");
            return self::SUCCESS;
        } catch (\Exception $e) {
            Log::error('Error al limpiar archivos temporales de registro', [
                'message' => $e->getMessage(),
            ]);

            $this->error('Error: ' . $e->getMessage());
            return self::FAILURE;
        }
    }
}
