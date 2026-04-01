<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Municipality extends Model
{
    protected $fillable = [
        'external_id',
        'name',
        'code',
    ];

    protected $casts = [
        'external_id' => 'integer',
    ];
}
