<?php

namespace App\Observers;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

abstract class BaseObserver
{
    /**
     * Obtiene el nombre del recurso para el log
     */
    abstract protected function getResourceName(): string;

    /**
     * Obtiene la descripcion para el evento created
     */
    protected function getCreatedDescription(Model $model): string
    {
        $name = $model->name ?? $model->title ?? "#{$model->id}";
        return "{$this->getResourceName()} creado: {$name}";
    }

    /**
     * Obtiene la descripcion para el evento updated
     */
    protected function getUpdatedDescription(Model $model): string
    {
        $name = $model->name ?? $model->title ?? "#{$model->id}";
        return "{$this->getResourceName()} actualizado: {$name}";
    }

    /**
     * Obtiene la descripcion para el evento deleted
     */
    protected function getDeletedDescription(Model $model): string
    {
        $name = $model->name ?? $model->title ?? "#{$model->id}";
        return "{$this->getResourceName()} eliminado: {$name}";
    }

    /**
     * Crea un log de actividad
     */
    protected function createActivityLog(Model $model, string $event, ?array $properties = null): void
    {
        $user = Auth::user();

        if (!$user) {
            return;
        }

        $description = match($event) {
            'created' => $this->getCreatedDescription($model),
            'updated' => $this->getUpdatedDescription($model),
            'deleted' => $this->getDeletedDescription($model),
            default => "{$this->getResourceName()} {$event}",
        };

        try {
            ActivityLog::create([
                'description' => $description,
                'event' => $event,
                'causer_type' => get_class($user),
                'causer_id' => $user->id,
                'subject_type' => get_class($model),
                'subject_id' => $model->id,
                'properties' => $properties,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Error creating activity log', [
                'error' => $e->getMessage(),
                'model' => get_class($model),
                'model_id' => $model->id,
            ]);
        }
    }

    /**
     * Handle the "created" event.
     */
    public function created(Model $model): void
    {
        $this->createActivityLog($model, 'created');
    }

    /**
     * Handle the "updated" event.
     */
    public function updated(Model $model): void
    {
        $changes = $model->getChanges();
        unset($changes['updated_at']);

        if (!empty($changes)) {
            $this->createActivityLog($model, 'updated', ['changes' => $changes]);
        }
    }

    /**
     * Handle the "deleted" event.
     */
    public function deleted(Model $model): void
    {
        $this->createActivityLog($model, 'deleted');
    }
}
