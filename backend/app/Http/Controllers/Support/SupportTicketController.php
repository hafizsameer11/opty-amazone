<?php

namespace App\Http\Controllers\Support;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Services\Support\SupportTicketService;
use Illuminate\Http\Request;

class SupportTicketController extends Controller
{
    public function __construct(private SupportTicketService $service) {}
    public function index(Request $r) { $p = $this->service->listForUser($r->user(), min(100, max(1, $r->integer('per_page', 20)))); return ResponseHelper::success(['tickets' => $p->items(), 'pagination' => ['current_page'=>$p->currentPage(),'last_page'=>$p->lastPage(),'per_page'=>$p->perPage(),'total'=>$p->total()]]); }
    public function store(Request $r) { $d = $r->validate(['subject'=>'required|string|max:180','category'=>'required|string|in:order,payment,shipping,refund,product,account,seller_store,technical,other','description'=>'required|string|max:10000','priority'=>'nullable|in:low,normal,high,urgent','order_id'=>'nullable|integer','store_id'=>'nullable|integer|exists:stores,id','product_id'=>'nullable|integer|exists:products,id','attachment'=>'nullable|file|max:5120|mimes:jpg,jpeg,png,gif,webp,pdf']); return ResponseHelper::success(['ticket'=>$this->service->create($r->user(), $d, $r->file('attachment'))], 'Ticket created', 201); }
    public function show(int $id, Request $r) { return ResponseHelper::success(['ticket'=>$this->service->userTicket($r->user(), $id)]); }
    public function reply(int $id, Request $r) { $d=$r->validate(['body'=>'nullable|string|max:10000','attachment'=>'nullable|file|max:5120|mimes:jpg,jpeg,png,gif,webp,pdf']); $t=$this->service->userTicket($r->user(),$id); return ResponseHelper::success(['message'=>$this->service->reply($r->user(),$t,$d['body']??'', $r->file('attachment'))], 'Reply sent', 201); }
    public function close(int $id, Request $r) { $t=$this->service->userTicket($r->user(),$id); return ResponseHelper::success(['ticket'=>$this->service->closeOrReopen($r->user(),$t,false)], 'Ticket closed'); }
    public function reopen(int $id, Request $r) { $t=$this->service->userTicket($r->user(),$id); abort_unless(in_array($t->status,['resolved','closed'],true),422,'Only resolved or closed tickets can be reopened.'); return ResponseHelper::success(['ticket'=>$this->service->closeOrReopen($r->user(),$t,true)], 'Ticket reopened'); }
}
