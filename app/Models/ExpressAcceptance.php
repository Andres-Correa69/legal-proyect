<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpressAcceptance extends Model
{
    protected $fillable = [
        'inventory_purchase_id',
        'receipt_acknowledgment_id',
        'uuid_reference',
        'number',
        'uuid',
        'issue_date',
        'status_description',
        'status_message',
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

    public function inventoryPurchase(): BelongsTo
    {
        return $this->belongsTo(InventoryPurchase::class);
    }

    public function receiptAcknowledgment(): BelongsTo
    {
        return $this->belongsTo(ReceiptAcknowledgment::class);
    }
}
