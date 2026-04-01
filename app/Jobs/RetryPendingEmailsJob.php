<?php

namespace App\Jobs;

use App\Mail\SaleInvoiceMail;
use App\Models\DocumentSupport;
use App\Models\ElectronicCreditNote;
use App\Models\ElectronicDebitNote;
use App\Models\ElectronicInvoice;
use App\Models\GoodsReceipt;
use App\Models\ReceiptAcknowledgment;
use App\Models\Sale;
use App\Services\ElectronicInvoicingService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class RetryPendingEmailsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Max retry attempts before giving up (status stays pending but stops retrying)
     */
    const MAX_RETRIES = 10;

    public function handle(ElectronicInvoicingService $eiService): void
    {
        $this->retrySaleEmails();
        $this->retryElectronicInvoiceEmails($eiService);
        $this->retryElectronicCreditNoteEmails($eiService);
        $this->retryElectronicDebitNoteEmails($eiService);
        $this->retryReceiptAcknowledgmentEmails($eiService);
        $this->retryGoodsReceiptEmails($eiService);
        $this->retryDocumentSupportEmails($eiService);
    }

    /**
     * Retry sale invoice emails via SMTP
     */
    private function retrySaleEmails(): void
    {
        $sales = Sale::where('email_status', 'pending')
            ->where('email_retry_count', '<', self::MAX_RETRIES)
            ->with(['client', 'items', 'payments', 'seller', 'branch.company'])
            ->limit(20)
            ->get();

        foreach ($sales as $sale) {
            try {
                $clientEmail = $sale->client?->email;
                if (empty($clientEmail)) {
                    continue;
                }

                $branch = $sale->branch;
                $companyModel = $branch?->company;

                $company = (object) [
                    'name' => $branch?->ei_business_name ?? $companyModel?->name ?? 'Empresa',
                    'nit' => $branch?->ei_tax_id ?? $companyModel?->tax_id ?? '',
                    'address' => $branch?->address ?? $companyModel?->address ?? '',
                    'city' => $branch?->city ?? '',
                    'phone' => $branch?->phone ?? $companyModel?->phone ?? '',
                    'email' => $branch?->email ?? $companyModel?->email ?? '',
                ];

                $pdf = Pdf::loadView('pdf.cuenta-cobro', [
                    'sale' => $sale,
                    'company' => $company,
                ]);
                $pdf->setPaper('letter', 'portrait');
                $pdf->setOption('isRemoteEnabled', true);
                $pdfContent = $pdf->output();

                Mail::to($clientEmail)->send(new SaleInvoiceMail(
                    sale: $sale,
                    companyName: $company->name,
                    pdfContent: $pdfContent,
                ));

                $sale->update([
                    'email_status' => 'sent',
                    'email_retry_count' => $sale->email_retry_count + 1,
                ]);

                Log::info('[RetryPendingEmails] Sale email enviado', [
                    'sale_id' => $sale->id,
                    'retry' => $sale->email_retry_count,
                ]);
            } catch (\Exception $e) {
                $sale->increment('email_retry_count');

                Log::warning('[RetryPendingEmails] Sale email falló', [
                    'sale_id' => $sale->id,
                    'retry' => $sale->email_retry_count,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Retry electronic invoice emails via DIAN API
     */
    private function retryElectronicInvoiceEmails(ElectronicInvoicingService $eiService): void
    {
        $invoices = ElectronicInvoice::where('email_status', 'pending')
            ->where('email_retry_count', '<', self::MAX_RETRIES)
            ->whereNotNull('uuid')
            ->with(['sale.client', 'sale.branch'])
            ->limit(20)
            ->get();

        foreach ($invoices as $invoice) {
            $this->retryDianEmail($eiService, $invoice, $invoice->sale);
        }
    }

    /**
     * Retry electronic credit note emails via DIAN API
     */
    private function retryElectronicCreditNoteEmails(ElectronicInvoicingService $eiService): void
    {
        $notes = ElectronicCreditNote::where('email_status', 'pending')
            ->where('email_retry_count', '<', self::MAX_RETRIES)
            ->whereNotNull('uuid')
            ->with(['electronicInvoice.sale.client', 'electronicInvoice.sale.branch'])
            ->limit(20)
            ->get();

        foreach ($notes as $note) {
            $this->retryDianEmail($eiService, $note, $note->electronicInvoice?->sale);
        }
    }

    /**
     * Retry electronic debit note emails via DIAN API
     */
    private function retryElectronicDebitNoteEmails(ElectronicInvoicingService $eiService): void
    {
        $notes = ElectronicDebitNote::where('email_status', 'pending')
            ->where('email_retry_count', '<', self::MAX_RETRIES)
            ->whereNotNull('uuid')
            ->with(['electronicInvoice.sale.client', 'electronicInvoice.sale.branch'])
            ->limit(20)
            ->get();

        foreach ($notes as $note) {
            $this->retryDianEmail($eiService, $note, $note->electronicInvoice?->sale);
        }
    }

    /**
     * Retry receipt acknowledgment emails via DIAN API
     */
    private function retryReceiptAcknowledgmentEmails(ElectronicInvoicingService $eiService): void
    {
        $receipts = ReceiptAcknowledgment::where('email_status', 'pending')
            ->where('email_retry_count', '<', self::MAX_RETRIES)
            ->whereNotNull('uuid')
            ->with(['inventoryPurchase.branch'])
            ->limit(20)
            ->get();

        foreach ($receipts as $receipt) {
            $branch = $receipt->inventoryPurchase?->branch;
            $this->retryDianEmailWithBranch($eiService, $receipt, $branch);
        }
    }

    /**
     * Retry goods receipt emails via DIAN API
     */
    private function retryGoodsReceiptEmails(ElectronicInvoicingService $eiService): void
    {
        $receipts = GoodsReceipt::where('email_status', 'pending')
            ->where('email_retry_count', '<', self::MAX_RETRIES)
            ->whereNotNull('uuid')
            ->with(['inventoryPurchase.branch'])
            ->limit(20)
            ->get();

        foreach ($receipts as $receipt) {
            $branch = $receipt->inventoryPurchase?->branch;
            $this->retryDianEmailWithBranch($eiService, $receipt, $branch);
        }
    }

    /**
     * Retry document support emails via DIAN API
     */
    private function retryDocumentSupportEmails(ElectronicInvoicingService $eiService): void
    {
        $documents = DocumentSupport::where('email_status', 'pending')
            ->where('email_retry_count', '<', self::MAX_RETRIES)
            ->whereNotNull('uuid')
            ->with(['inventoryPurchase.branch'])
            ->limit(20)
            ->get();

        foreach ($documents as $doc) {
            $branch = $doc->inventoryPurchase?->branch;
            $this->retryDianEmailWithBranch($eiService, $doc, $branch);
        }
    }

    /**
     * Generic retry for DIAN API emails (FE, NC, ND) - resolves branch from sale
     */
    private function retryDianEmail(ElectronicInvoicingService $eiService, $document, ?Sale $sale): void
    {
        $branch = $sale?->branch;
        $this->retryDianEmailWithBranch($eiService, $document, $branch, $sale?->client?->email);
    }

    /**
     * Generic retry for DIAN API emails with explicit branch
     */
    private function retryDianEmailWithBranch(ElectronicInvoicingService $eiService, $document, $branch, ?string $clientEmail = null): void
    {
        try {
            if (!$branch || empty($branch->electronic_invoicing_token)) {
                Log::warning('[RetryPendingEmails] No branch/token', [
                    'model' => get_class($document),
                    'id' => $document->id,
                ]);
                return;
            }

            $companyEmail = $branch->ei_email;
            if (empty($companyEmail)) {
                return;
            }

            $to = [$companyEmail];
            $cc = $clientEmail ? [$clientEmail] : [];

            $result = $eiService->sendEmail($document->uuid, $branch->electronic_invoicing_token, $to, $cc);

            $document->update([
                'email_status' => $result['success'] ? 'sent' : 'pending',
                'email_retry_count' => $document->email_retry_count + 1,
            ]);

            Log::info('[RetryPendingEmails] DIAN email ' . ($result['success'] ? 'enviado' : 'falló'), [
                'model' => class_basename($document),
                'id' => $document->id,
                'retry' => $document->email_retry_count,
            ]);
        } catch (\Exception $e) {
            $document->increment('email_retry_count');

            Log::warning('[RetryPendingEmails] DIAN email exception', [
                'model' => class_basename($document),
                'id' => $document->id,
                'retry' => $document->email_retry_count,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
