<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ProductPriceHistory extends Model
{
    use HasFactory, BelongsToCompany;

    protected $fillable = [
        'product_id',
        'company_id',
        'field',
        'old_value',
        'new_value',
        'old_text',
        'new_text',
        'reason',
        'reference_type',
        'reference_id',
        'changed_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'old_value' => 'float',
            'new_value' => 'float',
            'old_text' => 'string',
            'new_text' => 'string',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }
}
