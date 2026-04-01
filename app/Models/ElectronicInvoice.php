<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ElectronicInvoice extends Model
{
    protected $fillable = [
        'sale_id',
        'number',
        'uuid',
        'issue_date',
        'expedition_date',
        'status_description',
        'status_message',
        'xml_name',
        'zip_name',
        'zip_key',
        'qr_link',
        'xml_base64_bytes',
        'pdf_base64_bytes',
        'payload',
        'request_payload',
        'email_status',
        'email_retry_count',
    ];

    protected $casts = [
        'issue_date' => 'datetime',
        'expedition_date' => 'datetime',
        'payload' => 'array',
        'request_payload' => 'array',
    ];

    protected $hidden = [
        'xml_base64_bytes',
        'pdf_base64_bytes',
        'payload',
        'request_payload',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function creditNote(): HasOne
    {
        return $this->hasOne(ElectronicCreditNote::class);
    }

    public function creditNotes(): HasMany
    {
        return $this->hasMany(ElectronicCreditNote::class);
    }

    public function debitNote(): HasOne
    {
        return $this->hasOne(ElectronicDebitNote::class);
    }
}
