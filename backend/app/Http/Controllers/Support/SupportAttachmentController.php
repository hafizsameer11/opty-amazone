<?php

namespace App\Http\Controllers\Support;

use App\Http\Controllers\Controller;
use App\Models\SupportMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SupportAttachmentController extends Controller
{
    public function show(int $id, Request $request)
    {
        $message = SupportMessage::with('ticket')->findOrFail($id);
        abort_unless($request->user()->isAdmin() || (int) $message->ticket->user_id === (int) $request->user()->id, 403);
        abort_unless($message->attachment_path && Storage::disk('local')->exists($message->attachment_path), 404);
        return Storage::disk('local')->response($message->attachment_path, $message->attachment_name ?: 'attachment');
    }
}
