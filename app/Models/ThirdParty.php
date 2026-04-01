<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ThirdParty extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany;

    protected $table = 'third_parties';

    protected $fillable = [
        'company_id',
        'document_type',
        'document_id',
        'name',
        'first_name',
        'last_name',
        'business_name',
        'legal_representative',
        'email',
        'phone',
        'whatsapp_country',
        'whatsapp_number',
        'address',
        'country_code',
        'country_name',
        'state_code',
        'state_name',
        'city_name',
        'neighborhood',
        'commune',
        'birth_date',
        'gender',
        'occupation',
        'payment_terms',
        'observations',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'birth_date' => 'date',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
