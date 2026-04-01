<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceProduct extends Model
{
    use BelongsToCompany;

    protected $table = 'service_product';

    protected $fillable = [
        'company_id',
        'service_id',
        'product_id',
        'quantity',
        'is_included',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'is_included' => 'boolean',
    ];

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
