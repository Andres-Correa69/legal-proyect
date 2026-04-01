<?php

namespace App\Mail;

use App\Models\AlertLog;
use App\Models\AlertRule;
use App\Models\Company;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AlertNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public AlertRule $rule,
        public AlertLog $log,
        public ?Company $company = null,
    ) {}

    public function envelope(): Envelope
    {
        $typeLabels = [
            'low_stock' => 'Stock Bajo',
            'sales_decrease' => 'Disminución de Ventas',
            'inactive_clients' => 'Clientes Inactivos',
            'no_movement_products' => 'Productos sin Movimiento',
            'sales_target' => 'Meta de Ventas',
            'upcoming_invoices' => 'Facturas por Vencer',
            'high_expenses' => 'Gastos Elevados',
        ];

        $typeLabel = $typeLabels[$this->rule->type] ?? 'Alerta';
        $companyName = $this->company?->name ?? 'Sistema';

        return new Envelope(
            subject: "[Alerta] {$typeLabel} - {$this->rule->name} | {$companyName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.alert-notification',
        );
    }
}
