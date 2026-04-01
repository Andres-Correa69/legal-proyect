<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'company_id',
        'name',
        'slug',
        'code',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'latitude',
        'longitude',
        'is_active',
        'is_main',
        'settings',
        'rut_url',
        // Electronic Invoicing fields
        'electronic_invoicing_token',
        'electronic_invoicing_registered',
        'electronic_invoicing_registered_at',
        'ei_type_document_identification_id',
        'ei_type_organization_id',
        'ei_type_regime_id',
        'ei_type_liability_id',
        'ei_municipality_id',
        'ei_business_name',
        'ei_merchant_registration',
        'ei_address',
        'ei_phone',
        'ei_email',
        'ei_tax_id',
        // FE Configuration fields
        'ei_resolution_id',
        'ei_consecutive_start',
        'ei_consecutive_end',
        'ei_current_consecutive',
        'ei_environment',
        'ei_test_uuid',
        'ei_date_expiration',
        'ei_prefix',
        // Credit Note numbering fields
        'ei_cn_prefix',
        'ei_cn_consecutive_start',
        'ei_cn_consecutive_end',
        'ei_cn_current_consecutive',
        // Debit Note numbering fields
        'ei_dn_prefix',
        'ei_dn_consecutive_start',
        'ei_dn_consecutive_end',
        'ei_dn_current_consecutive',
        // Receipt Acknowledgment numbering fields
        'ei_ar_prefix',
        'ei_ar_consecutive_start',
        'ei_ar_consecutive_end',
        'ei_ar_current_consecutive',
        // Goods Receipt (Recibo del Bien) numbering fields
        'ei_rb_prefix',
        'ei_rb_consecutive_start',
        'ei_rb_consecutive_end',
        'ei_rb_current_consecutive',
        // Express Acceptance (Aceptación Expresa) numbering fields
        'ei_ea_prefix',
        'ei_ea_consecutive_start',
        'ei_ea_consecutive_end',
        'ei_ea_current_consecutive',
        // Saved person data for event auto-fill
        'ei_saved_person',
        // Document Support (Documento Soporte) fields
        'ei_ds_prefix',
        'ei_ds_resolution',
        'ei_ds_resolution_date',
        'ei_ds_consecutive_start',
        'ei_ds_consecutive_end',
        'ei_ds_current_consecutive',
        'ei_ds_date_from',
        'ei_ds_date_to',
        // Document Support Credit Note (Nota Crédito Doc. Soporte) fields
        'ei_ds_cn_prefix',
        'ei_ds_cn_resolution',
        'ei_ds_cn_resolution_date',
        'ei_ds_cn_consecutive_start',
        'ei_ds_cn_consecutive_end',
        'ei_ds_cn_current_consecutive',
        'ei_ds_cn_date_from',
        'ei_ds_cn_date_to',
        // Habilitación DIAN fields
        'ei_software_id',
        'ei_pin',
        'ei_certificate',
        'ei_certificate_password',
        'ei_habilitacion_data',
        // POS Electronic Invoice fields
        'ei_pos_prefix',
        'ei_pos_resolution_id',
        'ei_pos_consecutive_start',
        'ei_pos_consecutive_end',
        'ei_pos_current_consecutive',
        'ei_pos_software_id',
        'ei_pos_pin',
        // POS Credit Note (anulación POS) fields
        'ei_pos_cn_prefix',
        'ei_pos_cn_consecutive_start',
        'ei_pos_cn_consecutive_end',
        'ei_pos_cn_current_consecutive',
        // Payroll (Nómina Electrónica) global fields
        'ei_payroll_software_id',
        'ei_payroll_pin',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_main' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'settings' => 'array',
        'electronic_invoicing_registered' => 'boolean',
        'electronic_invoicing_registered_at' => 'datetime',
        'ei_resolution_id' => 'integer',
        'ei_consecutive_start' => 'integer',
        'ei_consecutive_end' => 'integer',
        'ei_current_consecutive' => 'integer',
        'ei_environment' => 'integer',
        'ei_cn_consecutive_start' => 'integer',
        'ei_cn_consecutive_end' => 'integer',
        'ei_cn_current_consecutive' => 'integer',
        'ei_dn_consecutive_start' => 'integer',
        'ei_dn_consecutive_end' => 'integer',
        'ei_dn_current_consecutive' => 'integer',
        'ei_ar_consecutive_start' => 'integer',
        'ei_ar_consecutive_end' => 'integer',
        'ei_ar_current_consecutive' => 'integer',
        'ei_rb_consecutive_start' => 'integer',
        'ei_rb_consecutive_end' => 'integer',
        'ei_rb_current_consecutive' => 'integer',
        'ei_ea_consecutive_start' => 'integer',
        'ei_ea_consecutive_end' => 'integer',
        'ei_ea_current_consecutive' => 'integer',
        'ei_saved_person' => 'array',
        'ei_ds_resolution_date' => 'date',
        'ei_ds_consecutive_start' => 'integer',
        'ei_ds_consecutive_end' => 'integer',
        'ei_ds_current_consecutive' => 'integer',
        'ei_ds_date_from' => 'date',
        'ei_ds_date_to' => 'date',
        'ei_ds_cn_resolution_date' => 'date',
        'ei_ds_cn_consecutive_start' => 'integer',
        'ei_ds_cn_consecutive_end' => 'integer',
        'ei_ds_cn_current_consecutive' => 'integer',
        'ei_ds_cn_date_from' => 'date',
        'ei_ds_cn_date_to' => 'date',
        'ei_date_expiration' => 'date',
        'ei_habilitacion_data' => 'array',
        'ei_pos_consecutive_start' => 'integer',
        'ei_pos_consecutive_end' => 'integer',
        'ei_pos_current_consecutive' => 'integer',
        'ei_pos_cn_consecutive_start' => 'integer',
        'ei_pos_cn_consecutive_end' => 'integer',
        'ei_pos_cn_current_consecutive' => 'integer',
    ];

    protected $hidden = [
        'ei_certificate',
        'ei_certificate_password',
    ];

    /**
     * Relación: Una sucursal pertenece a una empresa
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Relación: Una sucursal puede tener muchos usuarios
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Relación: Una sucursal puede tener muchos rangos de nómina
     */
    public function payrollNumberingRanges(): HasMany
    {
        return $this->hasMany(PayrollNumberingRange::class);
    }

    /**
     * Scope para filtrar por empresa
     */
    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    /**
     * Scope para sucursales activas
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para sucursal principal
     */
    public function scopeMain($query)
    {
        return $query->where('is_main', true);
    }
}
