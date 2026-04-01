<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollConfig extends Model
{
    protected $table = 'payroll_config';

    protected $fillable = [
        'year',
        'smmlv',
        'auxilio_transporte',
        'smmlv_previous',
        'increase_percentage',
        'decree_number',
        'effective_date',
    ];

    protected $casts = [
        'year' => 'integer',
        'smmlv' => 'float',
        'auxilio_transporte' => 'float',
        'smmlv_previous' => 'float',
        'increase_percentage' => 'float',
        'effective_date' => 'date',
    ];

    public static function current(): ?self
    {
        return static::where('year', now()->year)->first()
            ?? static::orderByDesc('year')->first();
    }

    public function totalWithTransport(): float
    {
        return $this->smmlv + $this->auxilio_transporte;
    }
}
