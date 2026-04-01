<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ActivityLog extends Model
{
    protected $fillable = [
        'description',
        'event',
        'causer_type',
        'causer_id',
        'subject_type',
        'subject_id',
        'properties',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'properties' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Usuario que realizó la acción
     */
    public function causer(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Recurso sobre el que se realizó la acción
     */
    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Crea un nuevo registro de actividad
     */
    public static function log(
        string $description,
        ?string $event = null,
        ?Model $subject = null,
        array $properties = []
    ): self {
        $causer = auth()->user();

        return self::create([
            'description' => $description,
            'event' => $event,
            'causer_type' => $causer ? get_class($causer) : null,
            'causer_id' => $causer?->id,
            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id' => $subject?->id,
            'properties' => $properties,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Scope para filtrar por evento
     */
    public function scopeByEvent($query, string $event)
    {
        return $query->where('event', $event);
    }

    /**
     * Scope para filtrar por tipo de sujeto
     */
    public function scopeBySubjectType($query, string $type)
    {
        return $query->where('subject_type', $type);
    }
}
