<?php

namespace App\Policies;

use App\Models\{User, DiscountCampaign};

class DiscountCampaignPolicy
{
    public function create(User $u): bool { return $u->role === 'seller' && $u->store !== null; }
    public function view(User $u, DiscountCampaign $c): bool { return $u->isAdmin() || ($u->role === 'seller' && (int) $u->store?->id === (int) $c->store_id); }
    public function manage(User $u, DiscountCampaign $c): bool { return $this->view($u, $c); }
}
