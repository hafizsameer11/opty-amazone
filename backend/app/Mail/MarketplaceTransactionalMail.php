<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MarketplaceTransactionalMail extends Mailable
{
    use Queueable, SerializesModels;

    /** @param array<string, string|int|float|null> $details @param array<int, array<string, string|int|float|null>> $items */
    public function __construct(
        public string $subjectLine,
        public string $heading,
        public string $intro,
        public array $details = [],
        public array $items = [],
        public ?string $ctaLabel = null,
        public ?string $ctaUrl = null,
        public ?string $notice = null,
        public ?string $code = null,
        public ?string $recipientName = null,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.marketplace-transactional', text: 'emails.marketplace-transactional-text');
    }
}
