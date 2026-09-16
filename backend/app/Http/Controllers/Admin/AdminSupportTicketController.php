<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Services\Support\SupportTicketService;
use Illuminate\Http\Request;

class AdminSupportTicketController extends Controller
{
    public function __construct(private SupportTicketService $service) {}
    public function index(Request $r) { $p=$this->service->adminList($r->only(['status','category','priority','user_role','search']), min(100,max(1,$r->integer('per_page',25)))); return ResponseHelper::success(['tickets'=>$p->items(),'pagination'=>['current_page'=>$p->currentPage(),'last_page'=>$p->lastPage(),'per_page'=>$p->perPage(),'total'=>$p->total()]]); }
    public function show(int $id) { return ResponseHelper::success(['ticket'=>$this->service->adminTicket($id)]); }
    public function reply(int $id, Request $r) { $d=$r->validate(['body'=>'nullable|string|max:10000','attachment'=>'nullable|file|max:5120|mimes:jpg,jpeg,png,gif,webp,pdf','is_internal'=>'nullable|boolean']); $t=$this->service->adminTicket($id); return ResponseHelper::success(['message'=>$this->service->reply($r->user(),$t,$d['body']??'', $r->file('attachment'), (bool)($d['is_internal']??false))], 'Reply sent', 201); }
    public function update(int $id, Request $r) { $d=$r->validate(['status'=>'required|in:open,in_progress,waiting_for_user,resolved,closed','priority'=>'nullable|in:low,normal,high,urgent','assigned_admin_id'=>'nullable|integer|exists:users,id']); $t=SupportTicket::findOrFail($id); return ResponseHelper::success(['ticket'=>$this->service->updateStatus($r->user(),$t,$d['status'],$d['priority']??null,$d['assigned_admin_id']??null)], 'Ticket updated'); }
}
