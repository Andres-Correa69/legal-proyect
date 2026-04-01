<?php

namespace App\Mail;

use App\Models\Sale;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SaleInvoiceMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Sale $sale,
        public string $companyName,
        public ?string $pdfContent = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Factura {$this->sale->invoice_number} - {$this->companyName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.sale-invoice',
        );
    }

    public function attachments(): array
    {
        if ($this->pdfContent) {
            return [
                \Illuminate\Mail\Mailables\Attachment::fromData(
                    fn () => $this->pdfContent,
                    $this->sale->invoice_number . '.pdf'
                )->withMime('application/pdf'),
            ];
        }

        return [];
    }
}
