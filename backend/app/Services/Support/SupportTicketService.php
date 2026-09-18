<?php

namespace App\Services\Support;

use App\Models\{Order, Product, Store, SupportMessage, SupportTicket, SupportTicketEvent, User};
use App\Services\Notifications\MarketplaceNotificationService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SupportTicketService
{
    public const STATUSES = ['open','in_progress','waiting_for_user','resolved','closed'];
    public const CATEGORIES = ['order','payment','shipping','refund','product','account','seller_store','technical','other'];

    public function listForUser(User $user, int $perPage = 20): LengthAwarePaginator
    {
        return SupportTicket::with(['user:id,name,email','assignedAdmin:id,name'])->where('user_id', $user->id)->where('user_role', $user->role)->latest('updated_at')->paginate($perPage);
    }

    public function create(User $user, array $data, ?UploadedFile $file = null): SupportTicket
    {
        $this->validateLinks($user, $data);
        return DB::transaction(function () use ($user, $data, $file) {
            $ticket = SupportTicket::create(['ticket_no' => 'TKT-'.now()->format('Ymd').'-'.strtoupper(Str::random(6)), 'user_id' => $user->id, 'user_role' => $user->role, 'subject' => trim($data['subject']), 'category' => $data['category'], 'description' => trim($data['description']), 'priority' => $data['priority'] ?? 'normal', 'status' => 'open', 'order_id' => $data['order_id'] ?? null, 'store_id' => $data['store_id'] ?? null, 'product_id' => $data['product_id'] ?? null]);
            $this->message($ticket, $user, $data['description'], $file, false);
            $ticket->update(['admin_unread_count' => 1]);
            $this->event($ticket, $user, 'created');
            app(MarketplaceNotificationService::class)->sendToAdmins(
                'support.ticket_created', 'New support ticket', "A new support ticket {$ticket->ticket_no} needs attention.",
                '/support', ['ticket_id' => $ticket->id, 'ticket_no' => $ticket->ticket_no]
            );
            return $ticket->fresh(['user:id,name,email','messages.sender:id,name']);
        });
    }

    public function userTicket(User $user, int $id): SupportTicket
    {
        $ticket = SupportTicket::with(['user:id,name,email','order:id,order_no','store:id,name','product:id,name','assignedAdmin:id,name','messages' => fn ($q) => $q->where('is_internal', false)->with('sender:id,name')->oldest(), 'events.actor:id,name'])->where('user_id', $user->id)->where('user_role', $user->role)->findOrFail($id);
        if ($ticket->user_unread_count) $ticket->update(['user_unread_count' => 0]);
        return $ticket;
    }

    public function reply(User $user, SupportTicket $ticket, string $body, ?UploadedFile $file = null, bool $internal = false): SupportMessage
    {
        if ($ticket->status === 'closed' && !$user->isAdmin()) abort(422, 'This ticket is closed.');
        $message = $this->message($ticket, $user, $body, $file, $internal);
        if (!$internal) { $counter = $user->isAdmin() ? 'user_unread_count' : 'admin_unread_count'; $ticket->update(['status' => $user->isAdmin() ? 'waiting_for_user' : 'in_progress', 'resolved_at' => null, 'closed_at' => null, $counter => DB::raw($counter.' + 1')]); }
        $this->event($ticket, $user, 'message_added');
        if (!$internal) {
            if ($user->isAdmin()) {
                app(MarketplaceNotificationService::class)->send(
                    $ticket->user,
                    'support.reply',
                    'Support replied to your ticket',
                    "Support has replied to ticket {$ticket->ticket_no}.",
                    '/profile?tab=support',
                    ['ticket_id' => $ticket->id, 'ticket_no' => $ticket->ticket_no]
                );
            } else {
                app(MarketplaceNotificationService::class)->sendToAdmins(
                    'support.reply', 'Support ticket reply', "A user replied to ticket {$ticket->ticket_no}.",
                    '/support', ['ticket_id' => $ticket->id, 'ticket_no' => $ticket->ticket_no]
                );
            }
        }
        return $message->load('sender:id,name');
    }

    public function closeOrReopen(User $user, SupportTicket $ticket, bool $reopen): SupportTicket
    {
        $ticket->update($reopen ? ['status' => 'open', 'closed_at' => null, 'resolved_at' => null] : ['status' => 'closed', 'closed_at' => now()]);
        $this->event($ticket, $user, $reopen ? 'reopened' : 'closed'); return $ticket->fresh();
    }

    public function adminList(array $filters, int $perPage = 25): LengthAwarePaginator
    {
        return SupportTicket::with(['user:id,name,email,role','assignedAdmin:id,name'])->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category', $v))->when($filters['priority'] ?? null, fn ($q, $v) => $q->where('priority', $v))->when($filters['user_role'] ?? null, fn ($q, $v) => $q->where('user_role', $v))->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($x) => $x->where('ticket_no','like',"%{$v}%")->orWhere('subject','like',"%{$v}%")))->latest('updated_at')->paginate($perPage);
    }

    public function adminTicket(int $id): SupportTicket { $ticket=SupportTicket::with(['user:id,name,email,role','assignedAdmin:id,name','order:id,order_no','store:id,name','product:id,name','messages.sender:id,name','events.actor:id,name'])->findOrFail($id); if($ticket->admin_unread_count)$ticket->update(['admin_unread_count'=>0]); return $ticket; }

    public function updateStatus(User $admin, SupportTicket $ticket, string $status, ?string $priority = null, ?int $assignedAdminId = null): SupportTicket
    {
        abort_unless(in_array($status, self::STATUSES, true), 422, 'Invalid ticket status.');
        $ticket->status = $status; if ($priority !== null) $ticket->priority = $priority; if ($assignedAdminId !== null) { abort_unless(User::whereKey($assignedAdminId)->where('role', 'admin')->exists(), 422, 'Assigned user must be an administrator.'); $ticket->assigned_admin_id = $assignedAdminId; }
        $ticket->resolved_at = $status === 'resolved' ? now() : ($status === 'closed' ? $ticket->resolved_at : null);
        $ticket->closed_at = $status === 'closed' ? now() : null; $ticket->save(); $this->event($ticket, $admin, 'status_changed', $status);
        app(MarketplaceNotificationService::class)->send(
            $ticket->user,
            'support.status_changed',
            'Support ticket updated',
            "Ticket {$ticket->ticket_no} is now {$status}.",
            '/profile?tab=support',
            ['ticket_id' => $ticket->id, 'ticket_no' => $ticket->ticket_no, 'status' => $status]
        );
        return $ticket->fresh(['user:id,name,email','assignedAdmin:id,name']);
    }

    private function message(SupportTicket $ticket, User $sender, string $body, ?UploadedFile $file, bool $internal): SupportMessage
    {
        $body = trim($body); $meta = null;
        if ($file) { $mime = $file->getMimeType() ?: ''; $isImage = str_starts_with($mime, 'image/'); $isPdf = $mime === 'application/pdf'; if (!$isImage && !$isPdf) abort(422, 'Attachment must be an image or PDF.'); if ($file->getSize() > 5 * 1024 * 1024) abort(422, 'Attachment must be 5MB or smaller.'); $meta = ['path' => $file->store("support/{$ticket->id}", 'local'), 'type' => $isImage ? 'image' : 'file', 'name' => $file->getClientOriginalName()]; }
        if ($body === '' && !$meta) abort(422, 'Message body or attachment is required.');
        return SupportMessage::create(['support_ticket_id' => $ticket->id, 'sender_id' => $sender->id, 'sender_role' => $sender->role, 'body' => $body ?: '[Attachment]', 'attachment_path' => $meta['path'] ?? null, 'attachment_type' => $meta['type'] ?? null, 'attachment_name' => $meta['name'] ?? null, 'is_internal' => $internal]);
    }

    private function event(SupportTicket $ticket, User $actor, string $event, ?string $details = null): void { SupportTicketEvent::create(['support_ticket_id' => $ticket->id, 'actor_id' => $actor->id, 'event' => $event, 'details' => $details]); }
    private function validateLinks(User $user, array $data): void
    {
        if (!empty($data['order_id'])) { $ok = $user->isBuyer() ? Order::whereKey($data['order_id'])->where('user_id', $user->id)->exists() : Order::whereKey($data['order_id'])->whereHas('storeOrders', fn ($q) => $q->where('store_id', $user->store?->id))->exists(); abort_unless($ok, 422, 'The selected order is not available to this account.'); }
        if ($user->isSeller() && !empty($data['store_id'])) abort_unless((int) $data['store_id'] === (int) $user->store?->id, 422, 'The selected store is not available to this account.');
    }
}
