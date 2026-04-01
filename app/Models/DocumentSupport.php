<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentSupport extends Model
{
    protected $fillable = [
        'inventory_purchase_id',
        'number',
        'uuid',
        'expedition_date',
        'status_description',
        'status_message',
        'qr_link',
        'pdf_download_link',
        'xml_base64_bytes',
        'pdf_base64_bytes',
        'payload',
        'request_payload',
        'voided',
        'void_uuid',
        'void_number',
        'void_date',
        'void_pdf_base64_bytes',
        'void_payload',
        'email_status',
        'email_retry_count',
    ];

    protected $casts = [
        'expedition_date' => 'date',
        'payload' => 'array',
        'request_payload' => 'array',
        'voided' => 'boolean',
        'void_date' => 'date',
        'void_payload' => 'array',
    ];

    protected $hidden = [
        'xml_base64_bytes',
        'pdf_base64_bytes',
        'payload',
        'request_payload',
        'void_pdf_base64_bytes',
        'void_payload',
    ];

    public function inventoryPurchase(): BelongsTo
    {
        return $this->belongsTo(InventoryPurchase::class);
    }
}
