<?php

namespace App\Observers;

use App\Models\User;

class UserObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Usuario';
    }

    protected function getCreatedDescription($model): string
    {
        return "Usuario creado: {$model->name} ({$model->email})";
    }

    protected function getUpdatedDescription($model): string
    {
        return "Usuario actualizado: {$model->name} ({$model->email})";
    }

    protected function getDeletedDescription($model): string
    {
        return "Usuario eliminado: {$model->name} ({$model->email})";
    }
}
