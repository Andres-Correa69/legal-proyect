<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TwoFactorCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $code,
        public string $type
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->type === 'activation'
            ? 'Codigo de activacion - Autenticacion en 2 pasos'
            : 'Codigo de verificacion - Inicio de sesion';

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.two-factor-code',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
