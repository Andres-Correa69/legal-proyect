<?php

namespace App\Console\Commands;

use App\Models\ApiClient;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class CreateApiClient extends Command
{
    protected $signature = 'api-client:create {name : Nombre del proyecto (ej: VetDash, Zyscore)}';

    protected $description = 'Crea un nuevo cliente API con su token de acceso';

    public function handle(): int
    {
        $name = $this->argument('name');

        $plainToken = 'sk_' . Str::random(61);

        $client = ApiClient::create([
            'name' => $name,
            'api_key' => hash('sha256', $plainToken),
        ]);

        $this->newLine();
        $this->info("Cliente API creado exitosamente:");
        $this->table(
            ['ID', 'Nombre', 'Creado'],
            [[$client->id, $client->name, $client->created_at]]
        );

        $this->newLine();
        $this->warn("⚠  GUARDA ESTE TOKEN - Solo se muestra una vez:");
        $this->newLine();
        $this->line("  {$plainToken}");
        $this->newLine();
        $this->info("Usa este token en el header: X-API-Key: {$plainToken}");

        return Command::SUCCESS;
    }
}
