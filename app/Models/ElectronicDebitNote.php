<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ElectronicDebitNote extends Model
{
    protected $fillable = [
        'electronic_invoice_id',
        'number',
        'uuid',
        'issue_date',
        'status_description',
        'status_message',
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
        'payload' => 'array',
        'request_payload' => 'array',
    ];

    protected $hidden = [
        'xml_base64_bytes',
        'pdf_base64_bytes',
        'payload',
        'request_payload',
    ];

    public function electronicInvoice(): BelongsTo
    {
        return $this->belongsTo(ElectronicInvoice::class);
    }
}
