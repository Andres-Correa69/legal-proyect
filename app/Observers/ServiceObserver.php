<?php

namespace App\Observers;

use App\Models\Service;
use Illuminate\Database\Eloquent\Model;

class ServiceObserver extends BaseObserver
{
    /**
     * Obtiene el nombre del recurso para el log
     */
    protected function getResourceName(): string
    {
        return 'Servicio';
    }

    /**
     * Obtiene la descripción para el evento created
     */
    protected function getCreatedDescription(Model $model): string
    {
        return "Servicio creado: {$model->name} (Precio: \${$model->price})";
    }

    /**
     * Obtiene la descripción para el evento updated
     */
    protected function getUpdatedDescription(Model $model): string
    {
        return "Servicio actualizado: {$model->name}";
    }

    /**
     * Obtiene la descripción para el evento deleted
     */
    protected function getDeletedDescription(Model $model): string
    {
        return "Servicio eliminado: {$model->name}";
    }

    /**
     * Handle the Service "updated" event.
     * Registra cambios de precio de forma especial
     */
    public function updated(Model $model): void
    {
        // Verificar si el precio cambió para crear un log más detallado
        if ($model->wasChanged('price')) {
            $oldPrice = $model->getOriginal('price');
            $newPrice = $model->price;

            $this->createActivityLog($model, 'price_changed', [
                'old_price' => $oldPrice,
                'new_price' => $newPrice,
                'difference' => $newPrice - $oldPrice,
                'percentage_change' => $oldPrice > 0
                    ? round((($newPrice - $oldPrice) / $oldPrice) * 100, 2)
                    : null,
            ]);
        }

        // Llamar al método padre para el log general de actualización
        parent::updated($model);
    }
}
