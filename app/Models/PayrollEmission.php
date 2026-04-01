<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollEmission extends Model
{
    protected $fillable = [
        'payroll_employee_id',
        'type',
        'uuid',
        'number',
        'issue_date_dian',
        'expedition_date',
        'status_code',
        'status_description',
        'status_message',
        'errors_messages',
        'xml_name',
        'zip_name',
        'qr_link',
        'xml_base64_bytes',
        'pdf_base64_bytes',
        'request_payload',
        'response_payload',
        'is_valid',
        'sent_at',
    ];

    protected $casts = [
        'errors_messages' => 'array',
        'request_payload' => 'array',
        'response_payload' => 'array',
        'is_valid' => 'boolean',
        'sent_at' => 'datetime',
    ];

    protected $hidden = [
        'xml_base64_bytes',
        'pdf_base64_bytes',
        'request_payload',
        'response_payload',
    ];

    public function payrollEmployee(): BelongsTo
    {
        return $this->belongsTo(PayrollEmployee::class);
    }
}
