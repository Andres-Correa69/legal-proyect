<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollEmployee extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'payroll_id',
        'company_id',
        'employee_id',
        'identification_number',
        'employee_name',
        'type_worker_id',
        'subtype_worker_id',
        'type_contract_id',
        'integral_salary',
        'high_risk_pension',
        'type_document_identification_id',
        'surname',
        'second_surname',
        'first_name',
        'other_names',
        'municipality_id',
        'address',
        'admission_date',
        'salary',
        'accrued_total',
        'deductions_total',
        'total',
        'payment_form_id',
        'payment_method_id',
        'bank',
        'account_type',
        'account_number',
        'accepted',
        'rejected',
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
        'sent_at',
        // Annulment fields
        'annulled',
        'annulment_uuid',
        'annulment_number',
        'annulment_issue_date',
        'annulment_qr_link',
        'annulment_request_payload',
        'annulment_response_payload',
        'annulment_pdf_base64_bytes',
        'annulled_at',
    ];

    protected $casts = [
        'type_worker_id' => 'integer',
        'subtype_worker_id' => 'integer',
        'type_contract_id' => 'integer',
        'integral_salary' => 'boolean',
        'high_risk_pension' => 'boolean',
        'type_document_identification_id' => 'integer',
        'municipality_id' => 'integer',
        'admission_date' => 'date',
        'salary' => 'decimal:2',
        'accrued_total' => 'decimal:2',
        'deductions_total' => 'decimal:2',
        'total' => 'decimal:2',
        'payment_form_id' => 'integer',
        'payment_method_id' => 'integer',
        'accepted' => 'boolean',
        'rejected' => 'boolean',
        'errors_messages' => 'array',
        'request_payload' => 'array',
        'response_payload' => 'array',
        'sent_at' => 'datetime',
        'annulled' => 'boolean',
        'annulment_request_payload' => 'array',
        'annulment_response_payload' => 'array',
        'annulled_at' => 'datetime',
    ];

    protected $hidden = [
        'xml_base64_bytes',
        'pdf_base64_bytes',
        'request_payload',
        'response_payload',
        'annulment_pdf_base64_bytes',
        'annulment_request_payload',
        'annulment_response_payload',
    ];

    public function payroll(): BelongsTo
    {
        return $this->belongsTo(Payroll::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function earnings(): HasMany
    {
        return $this->hasMany(PayrollEmployeeEarning::class);
    }

    public function deductions(): HasMany
    {
        return $this->hasMany(PayrollEmployeeDeduction::class);
    }

    public function emissions(): HasMany
    {
        return $this->hasMany(PayrollEmission::class);
    }
}
