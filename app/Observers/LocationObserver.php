<?php

namespace App\Observers;

use App\Models\Location;

class LocationObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Ubicación';
    }

    protected function getCreatedDescription($model): string
    {
        return "Ubicación creada: {$model->code} - {$model->name}";
    }

    protected function getUpdatedDescription($model): string
    {
        return "Ubicación actualizada: {$model->code} - {$model->name}";
    }

    protected function getDeletedDescription($model): string
    {
        return "Ubicación eliminada: {$model->code} - {$model->name}";
    }
}
